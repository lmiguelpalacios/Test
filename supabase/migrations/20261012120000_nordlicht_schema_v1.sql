-- Nordlicht Handels GmbH — Schema v1 (lokal im Repo)
-- NICHT automatisch deployen. Keine Secrets. Kein TrueFuel.
-- Zielprojekt (manuell, später): nordlicht-handels — nur nach Review.

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
  unique (organization_id, number)
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
  unique (organization_id, legacy_id)
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
  unique (organization_id, legacy_id)
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
  unique (organization_id, legacy_id)
);

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
create table public.sales_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  issue_date date not null,
  due_date date not null,
  customer_id uuid not null references public.customers (id),
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id)
);

create table public.sales_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.sales_invoices (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  quantity numeric not null check (quantity > 0),
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19))
);

create table public.sales_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  invoice_id uuid not null references public.sales_invoices (id),
  payment_date date not null,
  amount_cents int not null check (amount_cents > 0),
  bank_account text not null check (bank_account in ('1200', '1000')),
  reference text,
  journal_entry_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id)
);

-- ---------------------------------------------------------------------------
-- Purchase
-- ---------------------------------------------------------------------------
create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  supplier_id uuid not null references public.suppliers (id),
  order_date date not null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id)
);

create table public.purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  order_id uuid not null references public.purchase_orders (id) on delete cascade,
  legacy_id text,
  product_id uuid references public.products (id),
  description text not null,
  quantity numeric not null check (quantity > 0),
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  expense_account text not null,
  unique (organization_id, legacy_id)
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  number text not null,
  order_id uuid not null references public.purchase_orders (id),
  receipt_date date not null,
  created_at timestamptz not null default now(),
  unique (organization_id, number),
  unique (organization_id, legacy_id)
);

create table public.goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  receipt_id uuid not null references public.goods_receipts (id) on delete cascade,
  order_line_id uuid not null references public.purchase_order_lines (id),
  quantity numeric not null check (quantity > 0)
);

create table public.vendor_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  external_number text not null,
  internal_number text not null,
  supplier_id uuid not null references public.suppliers (id),
  issue_date date not null,
  due_date date not null,
  order_id uuid references public.purchase_orders (id),
  booked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, internal_number),
  unique (organization_id, legacy_id)
);

create table public.vendor_invoice_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid not null references public.vendor_invoices (id) on delete cascade,
  product_id uuid references public.products (id),
  description text not null,
  quantity numeric not null check (quantity > 0),
  net_unit_price_cents int not null check (net_unit_price_cents >= 0),
  vat_rate int not null check (vat_rate in (0, 7, 19)),
  expense_account text not null
);

create table public.vendor_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  invoice_id uuid not null references public.vendor_invoices (id),
  payment_date date not null,
  amount_cents int not null check (amount_cents > 0),
  bank_account text not null check (bank_account in ('1200', '1000')),
  reference text,
  journal_entry_id uuid,
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legacy_id text,
  product_id uuid not null references public.products (id),
  movement_date date not null,
  quantity_delta numeric not null check (quantity_delta <> 0),
  source_type text not null check (
    source_type in ('anfangsbestand', 'wareneingang', 'verkauf', 'anpassung')
  ),
  source_id text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (organization_id, legacy_id)
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
  unique (organization_id, legacy_id)
);

create index journal_entries_org_date_idx
  on public.journal_entries (organization_id, entry_date);

create table public.journal_lines (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  account_number text not null,
  debit_cents int not null default 0 check (debit_cents >= 0),
  credit_cents int not null default 0 check (credit_cents >= 0),
  check (
    (debit_cents > 0 and credit_cents = 0)
    or (credit_cents > 0 and debit_cents = 0)
  )
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
  journal_entry_id uuid not null references public.journal_entries (id) on delete cascade,
  unique (organization_id, document_type, document_id, journal_entry_id)
);

alter table public.sales_payments
  add constraint sales_payments_journal_entry_id_fkey
  foreign key (journal_entry_id) references public.journal_entries (id);

alter table public.vendor_payments
  add constraint vendor_payments_journal_entry_id_fkey
  foreign key (journal_entry_id) references public.journal_entries (id);

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

-- Progress always scoped to an organization the learner belongs to
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

-- ---------------------------------------------------------------------------
-- Import batches (idempotent workspace v4 import — later)
-- ---------------------------------------------------------------------------
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
-- Seed: account templates (SKR-ähnlich, wie Frontend chartOfAccounts)
-- ---------------------------------------------------------------------------
insert into public.account_templates (number, name, account_type, account_group) values
  ('0420', 'Büroeinrichtung', 'aktiv', 'Anlagevermögen'),
  ('0650', 'Büroorganisation', 'aktiv', 'Anlagevermögen'),
  ('3980', 'Bestand Waren', 'aktiv', 'Umlaufvermögen'),
  ('1200', 'Bank', 'aktiv', 'Finanzkonten'),
  ('1000', 'Kasse', 'aktiv', 'Finanzkonten'),
  ('1400', 'Forderungen aus Lief. u. Leist.', 'aktiv', 'Forderungen'),
  ('1600', 'Verbindlichkeiten aus Lief. u. Leist.', 'passiv', 'Verbindlichkeiten'),
  ('1800', 'Privatdarlehen / Sonstige Verbindlichkeiten', 'passiv', 'Verbindlichkeiten'),
  ('0800', 'Gezeichnetes Kapital', 'passiv', 'Eigenkapital'),
  ('0860', 'Gewinnvortrag', 'passiv', 'Eigenkapital'),
  ('8400', 'Erlöse 19 % USt', 'ertrag', 'Erträge'),
  ('8300', 'Erlöse 7 % USt', 'ertrag', 'Erträge'),
  ('8000', 'Erlöse steuerfrei', 'ertrag', 'Erträge'),
  ('3400', 'Wareneingang 19 % Vorsteuer', 'aufwand', 'Aufwendungen'),
  ('3300', 'Wareneingang 7 % Vorsteuer', 'aufwand', 'Aufwendungen'),
  ('4110', 'Löhne', 'aufwand', 'Aufwendungen'),
  ('4210', 'Miete', 'aufwand', 'Aufwendungen'),
  ('4920', 'Bürobedarf', 'aufwand', 'Aufwendungen'),
  ('4500', 'Fahrzeugkosten', 'aufwand', 'Aufwendungen'),
  ('4800', 'Reparaturen und Instandhaltung', 'aufwand', 'Aufwendungen'),
  ('1576', 'Abziehbare Vorsteuer 19 %', 'aktiv', 'Steuerkonten'),
  ('1571', 'Abziehbare Vorsteuer 7 %', 'aktiv', 'Steuerkonten'),
  ('1776', 'Umsatzsteuer 19 %', 'passiv', 'Steuerkonten'),
  ('1771', 'Umsatzsteuer 7 %', 'passiv', 'Steuerkonten');

-- Placeholder learning task catalog (full payload seed = later migration)
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
  ('lt-12', 12, 'Reparatur auf Rechnung', 'geschaeftsvorfall', 'leicht', '{"source":"frontend-learning-tasks"}'::jsonb);

-- Copy account templates into an organization
create or replace function public.seed_organization_accounts(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
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

comment on function public.seed_organization_accounts is
  'Copies account_templates + init sequences for an organization. Call after org create.';
