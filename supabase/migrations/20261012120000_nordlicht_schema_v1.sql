-- Nordlicht Handels GmbH — Schema v1 (lokal im Repo)
-- NICHT automatisch deployen. Keine Secrets. Kein TrueFuel.
-- Zielprojekt (manuell, später): nordlicht-handels — nur nach Security-Remediation + Review.
--
-- Entscheidung (2026-10-12): Datei in-place gehärtet (A1–A6/A7), weil diese Migrationen
-- nachweislich noch nie auf nordlicht-handels / TrueFuel / gemeinsamer Prod-DB angewendet wurden.
-- Siehe docs/supabase-security-remediation.md.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles (1:1 auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale text not null default 'de-DE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Trigger-only: no direct EXECUTE for clients
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Organizations & memberships
-- ---------------------------------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'teacher', 'student', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx
  on public.organization_members (user_id);

-- ---------------------------------------------------------------------------
-- Global reference: default chart of accounts (copied per org)
-- ---------------------------------------------------------------------------
create table public.account_templates (
  number text primary key,
  name text not null,
  account_type text not null check (account_type in ('aktiv', 'passiv', 'aufwand', 'ertrag')),
  account_group text not null
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  name text not null,
  account_type text not null check (account_type in ('aktiv', 'passiv', 'aufwand', 'ertrag')),
  account_group text not null,
  unique (organization_id, number),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Party / product master (organization-scoped)
-- ---------------------------------------------------------------------------
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  company_name text not null,
  contact_name text,
  billing_address text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id),
  unique (organization_id, id)
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  company_name text not null,
  contact_name text,
  billing_address text not null,
  email text,
  created_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id),
  unique (organization_id, id)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  sku text not null,
  name text not null,
  description text,
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  net_purchase_price_cents int not null check (net_purchase_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  tracks_stock boolean not null default true,
  min_stock_quantity int check (min_stock_quantity is null or min_stock_quantity >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, sku),
  unique (organization_id, legacy_id),
  unique (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Sales (composite FKs enforce same-organization references — A3)
-- ---------------------------------------------------------------------------
create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  issue_date date not null,
  due_date date not null,
  customer_id uuid not null,
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, customer_id)
    references public.customers (organization_id, id)
);

create table public.sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null,
  product_id uuid,
  description text not null,
  quantity numeric not null check (quantity > 0),
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  unique (organization_id, id),
  foreign key (organization_id, invoice_id)
    references public.sales_invoices (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products (organization_id, id)
);

create table public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  invoice_id uuid not null,
  payment_date date not null,
  amount_cents int not null check (amount_cents > 0),
  bank_account text not null check (bank_account in ('1200', '1000')),
  reference text,
  journal_entry_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, invoice_id)
    references public.sales_invoices (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Purchase
-- ---------------------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  supplier_id uuid not null,
  order_date date not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, supplier_id)
    references public.suppliers (organization_id, id)
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null,
  legacy_id text,
  product_id uuid,
  description text not null,
  quantity numeric not null check (quantity > 0),
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  expense_account text not null,
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.purchase_orders (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products (organization_id, id)
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  order_id uuid not null,
  receipt_date date not null,
  created_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, order_id)
    references public.purchase_orders (organization_id, id)
);

create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  receipt_id uuid not null,
  order_line_id uuid not null,
  quantity numeric not null check (quantity > 0),
  unique (organization_id, id),
  foreign key (organization_id, receipt_id)
    references public.goods_receipts (organization_id, id) on delete cascade,
  foreign key (organization_id, order_line_id)
    references public.purchase_order_lines (organization_id, id)
);

create table public.vendor_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  external_number text not null,
  internal_number text not null,
  supplier_id uuid not null,
  issue_date date not null,
  due_date date not null,
  order_id uuid,
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, internal_number),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, supplier_id)
    references public.suppliers (organization_id, id),
  foreign key (organization_id, order_id)
    references public.purchase_orders (organization_id, id)
);

create table public.vendor_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null,
  product_id uuid,
  description text not null,
  quantity numeric not null check (quantity > 0),
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  expense_account text not null,
  unique (organization_id, id),
  foreign key (organization_id, invoice_id)
    references public.vendor_invoices (organization_id, id) on delete cascade,
  foreign key (organization_id, product_id)
    references public.products (organization_id, id)
);

create table public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  invoice_id uuid not null,
  payment_date date not null,
  amount_cents int not null check (amount_cents > 0),
  bank_account text not null check (bank_account in ('1200', '1000')),
  reference text,
  journal_entry_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, invoice_id)
    references public.vendor_invoices (organization_id, id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  product_id uuid not null,
  movement_date date not null,
  quantity_delta numeric not null check (quantity_delta <> 0),
  source_type text not null check (
    source_type in ('anfangsbestand', 'wareneingang', 'verkauf', 'anpassung')
  ),
  source_id text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  foreign key (organization_id, product_id)
    references public.products (organization_id, id)
);

-- ---------------------------------------------------------------------------
-- Journal
-- ---------------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  entry_date date not null,
  document_number text not null,
  description text not null,
  debit_account text not null,
  credit_account text not null,
  net_amount_cents int not null check (net_amount_cents > 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  tax_amount_cents int not null check (tax_amount_cents >= 0),
  gross_amount_cents int not null check (gross_amount_cents > 0),
  explanation text not null default '',
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id),
  unique (organization_id, id),
  unique (organization_id, document_number),
  check (gross_amount_cents = net_amount_cents + tax_amount_cents)
);

create index journal_entries_org_date_idx
  on public.journal_entries (organization_id, entry_date);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  journal_entry_id uuid not null,
  account_number text not null,
  debit_cents int not null default 0 check (debit_cents >= 0),
  credit_cents int not null default 0 check (credit_cents >= 0),
  unique (organization_id, id),
  check (
    (debit_cents > 0 and credit_cents = 0)
    or (credit_cents > 0 and debit_cents = 0)
  ),
  foreign key (organization_id, journal_entry_id)
    references public.journal_entries (organization_id, id) on delete cascade
);

-- Replaces client-side journalEntryIds[] arrays
create table public.document_journal_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  document_type text not null check (
    document_type in (
      'sales_invoice',
      'sales_payment',
      'vendor_invoice',
      'vendor_payment',
      'manual',
      'learning_practice'
    )
  ),
  document_id uuid not null,
  journal_entry_id uuid not null,
  unique (organization_id, document_type, document_id, journal_entry_id),
  foreign key (organization_id, journal_entry_id)
    references public.journal_entries (organization_id, id) on delete cascade
);

-- At most one primary booking link per AR/ER document (Doppelbuchung)
create unique index document_journal_links_one_booking_idx
  on public.document_journal_links (organization_id, document_type, document_id)
  where document_type in ('sales_invoice', 'vendor_invoice');

alter table public.sales_payments
  add constraint sales_payments_journal_entry_org_fkey
  foreign key (organization_id, journal_entry_id)
  references public.journal_entries (organization_id, id);

alter table public.vendor_payments
  add constraint vendor_payments_journal_entry_org_fkey
  foreign key (organization_id, journal_entry_id)
  references public.journal_entries (organization_id, id);

-- ---------------------------------------------------------------------------
-- Document number sequences (atomic allocation later via RPC)
-- ---------------------------------------------------------------------------
create table public.document_sequences (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (
    kind in ('sales_invoice', 'purchase_order', 'goods_receipt', 'vendor_invoice', 'journal')
  ),
  next_value int not null check (next_value >= 1),
  primary key (organization_id, kind)
);

-- ---------------------------------------------------------------------------
-- Learning: global catalog + personal progress
-- ---------------------------------------------------------------------------
create table public.learning_tasks (
  id text primary key,
  number int not null unique,
  title text not null,
  topic text not null,
  difficulty text not null check (difficulty in ('leicht', 'mittel', 'schwer')),
  payload jsonb not null default '{}'::jsonb,
  max_points int not null default 4 check (max_points > 0),
  allow_practice_journal_post boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.learning_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id text not null references public.learning_tasks (id),
  attempts int not null default 0 check (attempts >= 0),
  best_score int not null default 0 check (best_score >= 0),
  completed boolean not null default false,
  last_attempt_at timestamptz,
  practice_posted_at timestamptz,
  primary key (user_id, organization_id, task_id)
);

create index learning_progress_org_idx
  on public.learning_progress (organization_id);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  content_hash text not null,
  source_label text,
  imported_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  unique (organization_id, content_hash)
);

-- ---------------------------------------------------------------------------
-- Integrity triggers (Phase 2)
-- ---------------------------------------------------------------------------

-- Soll = Haben across journal_lines (deferred so multi-row inserts work)
create or replace function public.assert_journal_entry_balanced()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
  v_debit bigint;
  v_credit bigint;
begin
  v_entry_id := coalesce(new.journal_entry_id, old.journal_entry_id);
  select
    coalesce(sum(debit_cents), 0),
    coalesce(sum(credit_cents), 0)
  into v_debit, v_credit
  from public.journal_lines
  where journal_entry_id = v_entry_id;

  if v_debit = 0 and v_credit = 0 then
    return coalesce(new, old);
  end if;

  if v_debit <> v_credit then
    raise exception 'journal entry % unbalanced: debit=% credit=%', v_entry_id, v_debit, v_credit;
  end if;

  return coalesce(new, old);
end;
$$;

revoke all on function public.assert_journal_entry_balanced() from public;
revoke all on function public.assert_journal_entry_balanced() from anon, authenticated;

create constraint trigger journal_lines_balanced_trg
  after insert or update or delete on public.journal_lines
  deferrable initially deferred
  for each row
  execute function public.assert_journal_entry_balanced();

-- Once booked, header stays booked; booked_at only set by DEFINER RPCs later
create or replace function public.enforce_invoice_booking_immutability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.booked_at is not null then
    raise exception '% % is booked and immutable', tg_table_name, old.id;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_invoice_booking_immutability() from public;
revoke all on function public.enforce_invoice_booking_immutability() from anon, authenticated;

create trigger sales_invoices_booking_immutable_trg
  before update on public.sales_invoices
  for each row
  execute function public.enforce_invoice_booking_immutability();

create trigger vendor_invoices_booking_immutable_trg
  before update on public.vendor_invoices
  for each row
  execute function public.enforce_invoice_booking_immutability();

-- Lines of booked invoices cannot change (defense in depth beyond RLS — A4)
create or replace function public.enforce_sales_invoice_lines_unlocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_org uuid := coalesce(new.organization_id, old.organization_id);
begin
  if exists (
    select 1 from public.sales_invoices i
    where i.id = v_invoice_id
      and i.organization_id = v_org
      and i.booked_at is not null
  ) then
    raise exception 'sales invoice % is booked; lines immutable', v_invoice_id;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.enforce_vendor_invoice_lines_unlocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_org uuid := coalesce(new.organization_id, old.organization_id);
begin
  if exists (
    select 1 from public.vendor_invoices i
    where i.id = v_invoice_id
      and i.organization_id = v_org
      and i.booked_at is not null
  ) then
    raise exception 'vendor invoice % is booked; lines immutable', v_invoice_id;
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.enforce_sales_invoice_lines_unlocked() from public;
revoke all on function public.enforce_sales_invoice_lines_unlocked() from anon, authenticated;
revoke all on function public.enforce_vendor_invoice_lines_unlocked() from public;
revoke all on function public.enforce_vendor_invoice_lines_unlocked() from anon, authenticated;

create trigger sales_invoice_lines_unlocked_trg
  before insert or update or delete on public.sales_invoice_lines
  for each row
  execute function public.enforce_sales_invoice_lines_unlocked();

create trigger vendor_invoice_lines_unlocked_trg
  before insert or update or delete on public.vendor_invoice_lines
  for each row
  execute function public.enforce_vendor_invoice_lines_unlocked();

-- Payments only against booked invoices; reject overpayment (line-gross heuristic)
create or replace function public.sales_invoice_gross_cents(p_org uuid, p_invoice uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(
      round(
        (l.quantity * l.net_unit_price_cents)::numeric * (1 + l.vat_rate / 100.0)
      )::int
    ),
    0
  )
  from public.sales_invoice_lines l
  where l.organization_id = p_org
    and l.invoice_id = p_invoice;
$$;

create or replace function public.vendor_invoice_gross_cents(p_org uuid, p_invoice uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    sum(
      round(
        (l.quantity * l.net_unit_price_cents)::numeric * (1 + l.vat_rate / 100.0)
      )::int
    ),
    0
  )
  from public.vendor_invoice_lines l
  where l.organization_id = p_org
    and l.invoice_id = p_invoice;
$$;

revoke all on function public.sales_invoice_gross_cents(uuid, uuid) from public;
revoke all on function public.vendor_invoice_gross_cents(uuid, uuid) from public;
grant execute on function public.sales_invoice_gross_cents(uuid, uuid) to authenticated;
grant execute on function public.vendor_invoice_gross_cents(uuid, uuid) to authenticated;

create or replace function public.enforce_sales_payment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booked timestamptz;
  v_gross int;
  v_paid int;
begin
  select booked_at into v_booked
  from public.sales_invoices
  where id = new.invoice_id and organization_id = new.organization_id;

  if v_booked is null then
    raise exception 'sales payment requires booked invoice %', new.invoice_id;
  end if;

  v_gross := public.sales_invoice_gross_cents(new.organization_id, new.invoice_id);
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.sales_payments
  where organization_id = new.organization_id
    and invoice_id = new.invoice_id
    and id is distinct from new.id;

  if v_paid + new.amount_cents > v_gross then
    raise exception 'sales payment overpays invoice % (paid=% + % > gross=%)',
      new.invoice_id, v_paid, new.amount_cents, v_gross;
  end if;

  return new;
end;
$$;

create or replace function public.enforce_vendor_payment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booked timestamptz;
  v_gross int;
  v_paid int;
begin
  select booked_at into v_booked
  from public.vendor_invoices
  where id = new.invoice_id and organization_id = new.organization_id;

  if v_booked is null then
    raise exception 'vendor payment requires booked invoice %', new.invoice_id;
  end if;

  v_gross := public.vendor_invoice_gross_cents(new.organization_id, new.invoice_id);
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.vendor_payments
  where organization_id = new.organization_id
    and invoice_id = new.invoice_id
    and id is distinct from new.id;

  if v_paid + new.amount_cents > v_gross then
    raise exception 'vendor payment overpays invoice % (paid=% + % > gross=%)',
      new.invoice_id, v_paid, new.amount_cents, v_gross;
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_sales_payment_rules() from public;
revoke all on function public.enforce_sales_payment_rules() from anon, authenticated;
revoke all on function public.enforce_vendor_payment_rules() from public;
revoke all on function public.enforce_vendor_payment_rules() from anon, authenticated;

create trigger sales_payments_rules_trg
  before insert or update on public.sales_payments
  for each row
  execute function public.enforce_sales_payment_rules();

create trigger vendor_payments_rules_trg
  before insert or update on public.vendor_payments
  for each row
  execute function public.enforce_vendor_payment_rules();

-- ---------------------------------------------------------------------------
-- Seed: account templates + learning task placeholders (idempotent — A7)
-- ---------------------------------------------------------------------------
insert into public.account_templates (number, name, account_type, account_group) values
('00', 'Ausstehende Einlagen', 'aktiv', 'Anlagevermögen'),
  ('01', 'Aufwendungen für Ingangsetzung', 'aktiv', 'Anlagevermögen'),
  ('02', 'Konzessionen, gewerbliche Schutzrechte und ähnliche Rechte und Werte sowie Lizenzen an solchen Rechten und Werten', 'aktiv', 'Anlagevermögen'),
  ('03', 'Geschäfts- oder Firmenwert', 'aktiv', 'Anlagevermögen'),
  ('05', 'Grundstücke, grundstücksgleiche Rechte und Bauten einschließlich der Bauten auf fremden Grundstücken', 'aktiv', 'Anlagevermögen'),
  ('07', 'Technische Anlagen und Maschinen', 'aktiv', 'Anlagevermögen'),
  ('070', 'Technische Anlagen', 'aktiv', 'Anlagevermögen'),
  ('071', 'Maschinen', 'aktiv', 'Anlagevermögen'),
  ('08', 'Andere Anlagen, Betriebs- und Geschäftsausstattung', 'aktiv', 'Anlagevermögen'),
  ('080', 'Andere Anlagen', 'aktiv', 'Anlagevermögen'),
  ('082', 'Werkzeuge', 'aktiv', 'Anlagevermögen'),
  ('083', 'Lager- und Transporteinrichtungen', 'aktiv', 'Anlagevermögen'),
  ('084', 'Fuhrpark', 'aktiv', 'Anlagevermögen'),
  ('085', 'Betriebsausstattung', 'aktiv', 'Anlagevermögen'),
  ('087', 'Geschäftsausstattung', 'aktiv', 'Anlagevermögen'),
  ('089', 'Geringwertige Wirtschaftsgüter', 'aktiv', 'Anlagevermögen'),
  ('09', 'Geleistete Anzahlungen und Anlagen im Bau', 'aktiv', 'Anlagevermögen'),
  ('090', 'Geleistete Anzahlungen auf Sachanlagen', 'aktiv', 'Anlagevermögen'),
  ('095', 'Anlagen im Bau', 'aktiv', 'Anlagevermögen'),
  ('13', 'Beteiligungen', 'aktiv', 'Anlagevermögen'),
  ('15', 'Wertpapiere des Anlagevermögens', 'aktiv', 'Anlagevermögen'),
  ('16', 'Sonstige Finanzanlagen (z.B. Darlehensforderungen)', 'aktiv', 'Anlagevermögen'),
  ('20', 'Roh-, Hilfs- und Betriebsstoffe und Fremdbauteile', 'aktiv', 'Umlaufvermögen'),
  ('200', 'Rohstoffe und Fremdbauteile', 'aktiv', 'Umlaufvermögen'),
  ('2001', 'Bezugskosten', 'aktiv', 'Umlaufvermögen'),
  ('2002', 'Preisnachlässe und Rücksendungen', 'aktiv', 'Umlaufvermögen'),
  ('2003', 'Liefererskonti', 'aktiv', 'Umlaufvermögen'),
  ('2004', 'Liefererboni', 'aktiv', 'Umlaufvermögen'),
  ('202', 'Hilfsstoffe', 'aktiv', 'Umlaufvermögen'),
  ('203', 'Betriebsstoffe', 'aktiv', 'Umlaufvermögen'),
  ('204', 'Sonstiges Material (z.B. Verpackungsmaterial)', 'aktiv', 'Umlaufvermögen'),
  ('21', 'Unfertige Erzeugnisse', 'aktiv', 'Umlaufvermögen'),
  ('22', 'Fertige Erzeugnisse und Waren', 'aktiv', 'Umlaufvermögen'),
  ('220', 'Fertige Erzeugnisse', 'aktiv', 'Umlaufvermögen'),
  ('221', 'Handelswaren', 'aktiv', 'Umlaufvermögen'),
  ('23', 'Geleistete Anzahlungen auf Vorräte', 'aktiv', 'Umlaufvermögen'),
  ('24', 'Forderungen', 'aktiv', 'Forderungen'),
  ('240', 'Forderungen aus Lieferungen und Leistungen (oder Debitor)', 'aktiv', 'Forderungen'),
  ('241', 'Zweifelhafte Forderungen', 'aktiv', 'Forderungen'),
  ('245', 'Wechselforderungen (Besitzwechsel)', 'aktiv', 'Forderungen'),
  ('26', 'Sonstige Vermögensgegenstände', 'aktiv', 'Umlaufvermögen'),
  ('260', 'Vorsteuer', 'aktiv', 'Steuerkonten'),
  ('263', 'Sonstige Forderungen an Finanzbehörden', 'aktiv', 'Umlaufvermögen'),
  ('264', 'Vorauszahlung Sozialversicherung', 'aktiv', 'Umlaufvermögen'),
  ('265', 'Forderungen an Mitarbeiter (z.B. Vorschüsse)', 'aktiv', 'Umlaufvermögen'),
  ('269', 'Sonstige Forderungen (Jahresabgrenzung)', 'aktiv', 'Umlaufvermögen'),
  ('27', 'Wertpapiere des Umlaufvermögens', 'aktiv', 'Umlaufvermögen'),
  ('28', 'Flüssige Mittel', 'aktiv', 'Finanzkonten'),
  ('280', 'Guthaben bei Kreditinstituten (Bank)', 'aktiv', 'Finanzkonten'),
  ('282', 'Kasse', 'aktiv', 'Finanzkonten'),
  ('29', 'Rechnungsabgrenzung', 'aktiv', 'Umlaufvermögen'),
  ('290', 'Aktive Rechnungsabgrenzung (Jahresabgrenzung)', 'aktiv', 'Umlaufvermögen'),
  ('291', 'Disagio', 'aktiv', 'Umlaufvermögen'),
  ('30', 'Eigenkapital/Gezeichnetes Kapital', 'passiv', 'Eigenkapital'),
  ('300', 'Eigenkapital / Kapital A / Gezeichnetes Kapital', 'passiv', 'Eigenkapital'),
  ('3001', 'Privat / Privat A', 'passiv', 'Eigenkapital'),
  ('301', 'Kapital B', 'passiv', 'Eigenkapital'),
  ('3011', 'Privat B', 'passiv', 'Eigenkapital'),
  ('307', 'Kommanditkapital C', 'passiv', 'Eigenkapital'),
  ('308', 'Kommanditkapital D', 'passiv', 'Eigenkapital'),
  ('31', 'Kapitalrücklage', 'passiv', 'Eigenkapital'),
  ('32', 'Gewinnrücklagen', 'passiv', 'Eigenkapital'),
  ('321', 'gesetzliche Rücklage', 'passiv', 'Eigenkapital'),
  ('322', 'Rücklage für eigene Anteile', 'passiv', 'Eigenkapital'),
  ('323', 'satzungsmäßige Rücklagen', 'passiv', 'Eigenkapital'),
  ('324', 'andere Gewinnrücklagen', 'passiv', 'Eigenkapital'),
  ('33', 'Ergebnisverwendung', 'passiv', 'Eigenkapital'),
  ('332', 'Ergebnisvortrag aus früheren Perioden', 'passiv', 'Eigenkapital'),
  ('335', 'Bilanzergebnis (Bilanzgewinn/Bilanzverlust)', 'passiv', 'Eigenkapital'),
  ('339', 'Ergebnisvortrag auf neue Rechnung', 'passiv', 'Eigenkapital'),
  ('34', 'Jahresüberschuss/Jahresfehlbetrag', 'passiv', 'Eigenkapital'),
  ('35', 'Sonderposten mit Rücklageanteil', 'passiv', 'Eigenkapital'),
  ('36', 'Wertberichtigungen', 'passiv', 'Verbindlichkeiten'),
  ('361', 'Wertberichtigungen zu Sachanlagen', 'passiv', 'Verbindlichkeiten'),
  ('367', 'Einzelwertberichtigung zu Forderungen', 'passiv', 'Verbindlichkeiten'),
  ('368', 'Pauschalwertberichtigungen zu Forderungen', 'passiv', 'Verbindlichkeiten'),
  ('37', 'Rückstellungen für Pensionen und ähnliche Verpflichtungen', 'passiv', 'Verbindlichkeiten'),
  ('38', 'Steuerrückstellungen', 'passiv', 'Verbindlichkeiten'),
  ('39', 'Sonstige Rückstellungen (z.B. für Gewährleistung)', 'passiv', 'Verbindlichkeiten'),
  ('41', 'Anleihen', 'passiv', 'Verbindlichkeiten'),
  ('42', 'Verbindlichkeiten gegenüber Kreditinstituten', 'passiv', 'Verbindlichkeiten'),
  ('43', 'Erhaltene Anzahlungen auf Bestellungen', 'passiv', 'Verbindlichkeiten'),
  ('44', 'Verbindlichkeiten aus Lieferungen und Leistungen (oder Kreditor)', 'passiv', 'Verbindlichkeiten'),
  ('45', 'Wechselverbindlichkeiten (Schuldwechsel)', 'passiv', 'Verbindlichkeiten'),
  ('48', 'Sonstige Verbindlichkeiten', 'passiv', 'Verbindlichkeiten'),
  ('480', 'Umsatzsteuer', 'passiv', 'Steuerkonten'),
  ('483', 'Sonstige Verbindlichkeiten gegenüber Finanzbehörden (z.B. abzuführende Lohnsteuer)', 'passiv', 'Verbindlichkeiten'),
  ('484', 'Verbindlichkeiten gegenüber Sozialversicherungsträgern', 'passiv', 'Verbindlichkeiten'),
  ('485', 'Verbindlichkeiten gegenüber Mitarbeitern', 'passiv', 'Verbindlichkeiten'),
  ('486', 'Verbindlichkeiten aus vermögenswirksamen Leistungen', 'passiv', 'Verbindlichkeiten'),
  ('489', 'Sonstige Verbindlichkeiten (Jahresabgrenzung)', 'passiv', 'Verbindlichkeiten'),
  ('49', 'Passive Rechnungsabgrenzung (Jahresabgrenzung)', 'passiv', 'Verbindlichkeiten'),
  ('50', 'Umsatzerlöse', 'ertrag', 'Erträge'),
  ('500', 'Umsatzerlöse für Erzeugnisse und Leistungen', 'ertrag', 'Erträge'),
  ('5001', 'Preisnachlässe und Rücksendungen', 'ertrag', 'Erträge'),
  ('5002', 'Kundenskonti', 'ertrag', 'Erträge'),
  ('5003', 'Kundenboni', 'ertrag', 'Erträge'),
  ('501', 'Umsatzerlöse für Handelswaren', 'ertrag', 'Erträge'),
  ('52', 'Erhöhung oder Verminderung des Bestandes an unfertigen und fertigen Erzeugnissen', 'ertrag', 'Erträge'),
  ('521', 'Bestandsveränderungen an unfertigen Erzeugnissen', 'ertrag', 'Erträge'),
  ('522', 'Bestandsveränderungen an fertigen Erzeugnissen', 'ertrag', 'Erträge'),
  ('53', 'Andere aktivierte Eigenleistungen', 'ertrag', 'Erträge'),
  ('54', 'Sonstige betriebliche Erträge', 'ertrag', 'Erträge'),
  ('540', 'Erträge aus Vermietung und Verpachtung', 'ertrag', 'Erträge'),
  ('541', 'Provisionserträge', 'ertrag', 'Erträge'),
  ('542', 'Unentgeltliche Wertabgaben', 'ertrag', 'Erträge'),
  ('543', 'Andere sonstige betriebliche Erträge', 'ertrag', 'Erträge'),
  ('544', 'Erträge aus Werterhöhungen von Gegenständen des Anlagevermögens (Zuschreibungen)', 'ertrag', 'Erträge'),
  ('545', 'Erträge aus der Auflösung oder Herabsetzung von Wertberichtigungen auf Forderungen', 'ertrag', 'Erträge'),
  ('546', 'Erträge aus dem Abgang von Sachgegenständen des Sachanlagevermögens', 'ertrag', 'Erträge'),
  ('5461', 'Erlöse aus dem Abgang von Gegenständen des Sachanlagevermögens bei Buchgewinn (Verrechnung mit Konto 546)', 'ertrag', 'Erträge'),
  ('547', 'Erlöse aus direkt abgeschriebenen Forderungen', 'ertrag', 'Erträge'),
  ('548', 'Erträge aus der Auflösung oder Herabsetzung von Rückstellungen', 'ertrag', 'Erträge'),
  ('549', 'Andere periodenfremde Erträge', 'ertrag', 'Erträge'),
  ('55', 'Erträge aus Beteiligungen', 'ertrag', 'Erträge'),
  ('56', 'Erträge aus anderen Finanzanlagen', 'ertrag', 'Erträge'),
  ('57', 'Sonstige Zinsen und ähnliche Erträge', 'ertrag', 'Erträge'),
  ('571', 'Zinserträge', 'ertrag', 'Erträge'),
  ('573', 'Diskonterträge', 'ertrag', 'Erträge'),
  ('578', 'Erträge aus Wertpapieren des Umlaufvermögens', 'ertrag', 'Erträge'),
  ('58', 'Außerordentliche Erträge', 'ertrag', 'Erträge'),
  ('60', 'Aufwendungen für Roh-, Hilfs- und Betriebsstoffe und für bezogene Waren', 'aufwand', 'Aufwendungen'),
  ('600', 'Aufwendungen für Rohstoffe und Fremdbauteile (Fertigungsmaterial)', 'aufwand', 'Aufwendungen'),
  ('6001', 'Bezugskosten', 'aufwand', 'Aufwendungen'),
  ('6002', 'Preisnachlässe und Rücksendungen', 'aufwand', 'Aufwendungen'),
  ('6003', 'Lieferskonti', 'aufwand', 'Aufwendungen'),
  ('6004', 'Lieferboni', 'aufwand', 'Aufwendungen'),
  ('602', 'Aufwendungen für Hilfsstoffe', 'aufwand', 'Aufwendungen'),
  ('603', 'Aufwendungen für Betriebsstoffe', 'aufwand', 'Aufwendungen'),
  ('604', 'Aufwendungen für sonstiges Material (z.B. Verpackungsmaterial)', 'aufwand', 'Aufwendungen'),
  ('605', 'Aufwendungen für Energie und Treibstoffe', 'aufwand', 'Aufwendungen'),
  ('608', 'Aufwendungen für Handelswaren', 'aufwand', 'Aufwendungen'),
  ('61', 'Aufwendungen für bezogene Leistungen', 'aufwand', 'Aufwendungen'),
  ('610', 'Fremdleistungen für Erzeugnisse', 'aufwand', 'Aufwendungen'),
  ('613', 'Instandhaltung und Reparaturen', 'aufwand', 'Aufwendungen'),
  ('614', 'Frachten und Fremdlager', 'aufwand', 'Aufwendungen'),
  ('615', 'Vertriebsprovisionen', 'aufwand', 'Aufwendungen'),
  ('617', 'Sonstige Aufwendungen für bezogene Leistungen', 'aufwand', 'Aufwendungen'),
  ('62', 'Löhne', 'aufwand', 'Aufwendungen'),
  ('63', 'Gehälter', 'aufwand', 'Aufwendungen'),
  ('64', 'Soziale Abgaben und Aufwendungen für Altersversorgung und Unterstützung', 'aufwand', 'Aufwendungen'),
  ('640', 'Arbeitgeberanteil zur Sozialversicherung', 'aufwand', 'Aufwendungen'),
  ('642', 'Beiträge zur Berufsgenossenschaft', 'aufwand', 'Aufwendungen'),
  ('644', 'Aufwendungen für Altersversorgung', 'aufwand', 'Aufwendungen'),
  ('649', 'Aufwendungen für Unterstützung', 'aufwand', 'Aufwendungen'),
  ('65', 'Abschreibungen', 'aufwand', 'Aufwendungen'),
  ('650', 'Abschreibungen auf Sachanlagen', 'aufwand', 'Aufwendungen'),
  ('651', 'Abschreibungen auf immaterielle Vermögensgegenstände des Anlagevermögens', 'aufwand', 'Aufwendungen'),
  ('652', 'Abschreibungen für Aufwendungen der Ingangsetzung', 'aufwand', 'Aufwendungen'),
  ('653', 'Abschreibungen auf Vermögensgegenstände des Umlaufvermögens, soweit diese die üblichen Abschreibungen überschreiten', 'aufwand', 'Aufwendungen'),
  ('654', 'Abschreibungen auf geringwertige Wirtschaftsgüter', 'aufwand', 'Aufwendungen'),
  ('66', 'Sonstige Personalaufwendungen', 'aufwand', 'Aufwendungen'),
  ('67', 'Aufwendungen für die Inanspruchnahme von Rechten und Diensten', 'aufwand', 'Aufwendungen'),
  ('670', 'Mieten, Pachten', 'aufwand', 'Aufwendungen'),
  ('671', 'Leasing', 'aufwand', 'Aufwendungen'),
  ('675', 'Kosten des Geldverkehrs', 'aufwand', 'Aufwendungen'),
  ('677', 'Rechts- und Beratungskosten', 'aufwand', 'Aufwendungen'),
  ('679', 'Sonstige Aufwendungen für die Inanspruchnahme von Rechten und Diensten', 'aufwand', 'Aufwendungen'),
  ('68', 'Aufwendungen für Kommunikation', 'aufwand', 'Aufwendungen'),
  ('680', 'Büromaterial', 'aufwand', 'Aufwendungen'),
  ('682', 'Gebühren', 'aufwand', 'Aufwendungen'),
  ('685', 'Reisekosten', 'aufwand', 'Aufwendungen'),
  ('686', 'Bewirtung und Repräsentation', 'aufwand', 'Aufwendungen'),
  ('687', 'Werbung', 'aufwand', 'Aufwendungen'),
  ('688', 'Spenden', 'aufwand', 'Aufwendungen'),
  ('689', 'Sonstige Aufwendungen für Kommunikation', 'aufwand', 'Aufwendungen'),
  ('69', 'Aufwendungen für Beiträge und Sonstiges sowie Wertkorrekturen und periodenfremde Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('690', 'Versicherungsbeiträge', 'aufwand', 'Aufwendungen'),
  ('692', 'Beiträge zu Wirtschaftsverbänden und Berufsvertretungen', 'aufwand', 'Aufwendungen'),
  ('693', 'Verluste aus Schadensfällen', 'aufwand', 'Aufwendungen'),
  ('695', 'Abschreibungen auf Forderungen', 'aufwand', 'Aufwendungen'),
  ('6951', 'Abschreibungen auf Forderungen wegen Uneinbringlichkeit', 'aufwand', 'Aufwendungen'),
  ('6952', 'Einstellung in Einzelwertberichtigungen', 'aufwand', 'Aufwendungen'),
  ('6953', 'Einstellung in Pauschalwertberichtigungen', 'aufwand', 'Aufwendungen'),
  ('696', 'Verluste aus dem Abgang von Gegenständen des Sachanlagevermögens', 'aufwand', 'Aufwendungen'),
  ('6961', 'Erlöse aus dem Abgang von Gegenständen des Sachanlagevermögens bei Buchverlust (Verrechnung mit Konto 696)', 'aufwand', 'Aufwendungen'),
  ('698', 'Zuführung zu Rückstellungen für Gewährleistung', 'aufwand', 'Aufwendungen'),
  ('699', 'Periodenfremde Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('70', 'Betriebliche Steuern', 'aufwand', 'Aufwendungen'),
  ('702', 'Grundsteuer', 'aufwand', 'Aufwendungen'),
  ('703', 'Kraftfahrzeugsteuer', 'aufwand', 'Aufwendungen'),
  ('707', 'Verbrauchsteuern', 'aufwand', 'Aufwendungen'),
  ('708', 'Sonstige betriebliche Steuern', 'aufwand', 'Aufwendungen'),
  ('709', 'Steuernachzahlungen und -rückerstattungen bei betrieblichen Steuern', 'aufwand', 'Aufwendungen'),
  ('74', 'Abschreibungen auf Finanzanlagen und auf Wertpapiere des Umlaufvermögens', 'aufwand', 'Aufwendungen'),
  ('75', 'Zinsen und ähnliche Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('751', 'Zinsaufwendungen', 'aufwand', 'Aufwendungen'),
  ('753', 'Diskontaufwendungen', 'aufwand', 'Aufwendungen'),
  ('76', 'Außerordentliche Aufwendungen', 'aufwand', 'Aufwendungen'),
  ('77', 'Steuern vom Einkommen und Ertrag', 'aufwand', 'Aufwendungen'),
  ('770', 'Gewerbesteuer', 'aufwand', 'Aufwendungen'),
  ('771', 'Körperschaftsteuer', 'aufwand', 'Aufwendungen'),
  ('772', 'Kapitalertragsteuer', 'aufwand', 'Aufwendungen'),
  ('779', 'Steuernachzahlungen und -rückerstattungen bei Steuern vom Einkommen und Ertrag', 'aufwand', 'Aufwendungen'),
  ('80', 'Eröffnung/Abschluss', 'passiv', 'Eigenkapital'),
  ('800', 'Eröffnungsbilanz', 'passiv', 'Eigenkapital'),
  ('801', 'Schlussbilanz', 'passiv', 'Eigenkapital'),
  ('802', 'G+V', 'passiv', 'Eigenkapital')
on conflict (number) do nothing;

insert into public.learning_tasks (id, number, title, topic, difficulty, payload) values
  ('lt-01', 1, 'Aktiv oder Passiv? Banküberweisung eingehend', 'aktiv_passiv', 'leicht', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-02', 2, 'Soll und Haben bei Aufwand', 'soll_haben', 'leicht', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-03', 3, 'Einfacher Geschäftsvorfall: Barkauf Bürobedarf', 'geschaeftsvorfall', 'leicht', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-04', 4, 'Wareneinkauf auf Rechnung', 'wareneinkauf', 'mittel', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-05', 5, 'Zahlung einer Lieferantenrechnung', 'zahlung_lieferant', 'mittel', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-06', 6, 'Warenverkauf auf Rechnung', 'warenverkauf', 'mittel', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-07', 7, 'Zahlungseingang vom Kunden', 'zahlung_kunde', 'mittel', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-08', 8, 'Vorsteuer bei Einkauf 7 %', 'ust_vst', 'mittel', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-09', 9, 'Umsatzsteuer bei Verkauf 7 %', 'ust_vst', 'mittel', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-10', 10, 'Wirkung auf GuV: Fahrzeugkosten', 'bilanz_guv', 'schwer', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-11', 11, 'Aktivtausch ohne GuV-Wirkung', 'bilanz_guv', 'schwer', '{"source":"frontend-learning-tasks"}'::jsonb),
  ('lt-12', 12, 'Reparatur auf Rechnung', 'geschaeftsvorfall', 'leicht', '{"source":"frontend-learning-tasks"}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- DEFINER helpers used by seed / create_organization (authz — A2)
-- Note: RLS helpers (is_org_member, …) live in the RLS migration; seed uses
-- a membership lookup with fixed search_path (no RLS recursion issues as DEFINER).
-- ---------------------------------------------------------------------------
create or replace function public.seed_organization_accounts(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'seed_organization_accounts: not authenticated';
  end if;

  if not exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ) then
    raise exception 'seed_organization_accounts: owner role required for org %', p_org_id;
  end if;

  insert into public.accounts (organization_id, number, name, account_type, account_group)
  select p_org_id, t.number, t.name, t.account_type, t.account_group
  from public.account_templates t
  on conflict (organization_id, number) do nothing;

  insert into public.document_sequences (organization_id, kind, next_value)
  values
    (p_org_id, 'sales_invoice', 1),
    (p_org_id, 'purchase_order', 1),
    (p_org_id, 'goods_receipt', 1),
    (p_org_id, 'vendor_invoice', 1),
    (p_org_id, 'journal', 1)
  on conflict do nothing;
end;
$$;

revoke all on function public.seed_organization_accounts(uuid) from public;
revoke all on function public.seed_organization_accounts(uuid) from anon;
grant execute on function public.seed_organization_accounts(uuid) to authenticated;

-- A1: atomic org + first owner (no RLS-blind NOT EXISTS bootstrap)
create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org_id uuid;
begin
  if v_uid is null then
    raise exception 'create_organization: not authenticated';
  end if;

  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'create_organization: name required';
  end if;

  if p_slug is null or length(trim(p_slug)) = 0 then
    raise exception 'create_organization: slug required';
  end if;

  insert into public.organizations (name, slug)
  values (trim(p_name), trim(p_slug))
  returning id into v_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (v_org_id, v_uid, 'owner');

  perform public.seed_organization_accounts(v_org_id);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
revoke all on function public.create_organization(text, text) from anon;
grant execute on function public.create_organization(text, text) to authenticated;

comment on function public.seed_organization_accounts is
  'Owner-only. Copies account_templates + init sequences. Called from create_organization.';
comment on function public.create_organization is
  'Authenticated bootstrap: insert org + caller as owner + seed accounts/sequences. Replaces unsafe RLS NOT EXISTS bootstrap.';
