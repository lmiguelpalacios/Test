-- Nordlicht — Phase 2 booking RPCs (real bodies)
-- Replaces stub implementations for:
--   next_document_number, book_sales_invoice, book_vendor_invoice,
--   record_sales_payment, record_vendor_payment
-- Leaves goods_receipt / learning / import as stubs (see sql/rpc_booking_stubs.sql).
--
-- Schema note: drop partial unique one-booking link index so multi-VAT invoices
-- can create one journal entry + link per USt group (client parity). Doppelbuchung
-- is enforced by booked_at IS NULL + FOR UPDATE + already_booked error.

-- ---------------------------------------------------------------------------
-- Multi-VAT: allow multiple sales_invoice / vendor_invoice links per document
-- ---------------------------------------------------------------------------
drop index if exists public.document_journal_links_one_booking_idx;

comment on table public.document_journal_links is
  'Links documents to journal entries. Multiple sales_invoice/vendor_invoice links per document are allowed (one per USt group). Doppelbuchung via booked_at + RPC.';

-- ---------------------------------------------------------------------------
-- Internal helpers (no client EXECUTE)
-- ---------------------------------------------------------------------------
create or replace function public._nl_tax_cents(p_net int, p_vat int)
returns int
language sql
immutable
as $$
  select round((p_net::numeric * p_vat::numeric) / 100.0)::int;
$$;

create or replace function public._nl_line_net_cents(p_qty numeric, p_unit int)
returns int
language sql
immutable
as $$
  select round(p_qty * p_unit)::int;
$$;

create or replace function public._nl_revenue_account(p_vat int)
returns text
language sql
immutable
as $$
  select case p_vat
    when 19 then '8400'
    when 7 then '8300'
    else '8000'
  end;
$$;

create or replace function public._nl_ust_account(p_vat int)
returns text
language sql
immutable
as $$
  select case p_vat when 7 then '1771' when 19 then '1776' else null end;
$$;

create or replace function public._nl_vst_account(p_vat int)
returns text
language sql
immutable
as $$
  select case p_vat when 7 then '1571' when 19 then '1576' else null end;
$$;

revoke all on function public._nl_tax_cents(int, int) from public, anon, authenticated;
revoke all on function public._nl_line_net_cents(numeric, int) from public, anon, authenticated;
revoke all on function public._nl_revenue_account(int) from public, anon, authenticated;
revoke all on function public._nl_ust_account(int) from public, anon, authenticated;
revoke all on function public._nl_vst_account(int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- next_document_number
-- ---------------------------------------------------------------------------
create or replace function public.next_document_number(
  p_organization_id uuid,
  p_kind text
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  if p_kind not in (
    'sales_invoice', 'purchase_order', 'goods_receipt', 'vendor_invoice', 'journal'
  ) then
    raise exception 'invalid document kind: %', p_kind;
  end if;

  select next_value into v_next
  from public.document_sequences
  where organization_id = p_organization_id and kind = p_kind
  for update;

  if v_next is null then
    raise exception 'document sequence missing for org % kind %', p_organization_id, p_kind;
  end if;

  update public.document_sequences
  set next_value = v_next + 1
  where organization_id = p_organization_id and kind = p_kind;

  return v_next;
end;
$$;

comment on function public.next_document_number(uuid, text) is
  'Atomic sequence allocation: FOR UPDATE document_sequences, return previous next_value.';

-- ---------------------------------------------------------------------------
-- book_sales_invoice
-- ---------------------------------------------------------------------------
create or replace function public.book_sales_invoice(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.sales_invoices%rowtype;
  v_customer_name text;
  v_group record;
  v_group_count int;
  v_net int;
  v_tax int;
  v_gross int;
  v_revenue text;
  v_ust text;
  v_entry_id uuid;
  v_first_entry_id uuid;
  v_doc_number text;
  v_desc text;
  v_line record;
  v_tracks boolean;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select * into v_inv
  from public.sales_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'sales invoice not found';
  end if;

  if v_inv.booked_at is not null then
    raise exception 'already_booked: sales invoice %', p_invoice_id;
  end if;

  select c.company_name into v_customer_name
  from public.customers c
  where c.id = v_inv.customer_id and c.organization_id = p_organization_id;

  if v_customer_name is null then
    raise exception 'customer not found for invoice';
  end if;

  if not exists (
    select 1 from public.sales_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
  ) then
    raise exception 'invoice has no lines';
  end if;

  -- USt groups (client parity: sum nets per rate, then tax on group net)
  select count(*) into v_group_count
  from (
    select l.vat_rate
    from public.sales_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.vat_rate
  ) g;

  for v_group in
    select
      l.vat_rate,
      sum(public._nl_line_net_cents(l.quantity, l.net_unit_price_cents))::int as net_cents
    from public.sales_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.vat_rate
    order by l.vat_rate
  loop
    v_net := v_group.net_cents;
    if v_net <= 0 then
      raise exception 'invalid group net for vat %', v_group.vat_rate;
    end if;
    v_tax := public._nl_tax_cents(v_net, v_group.vat_rate);
    v_gross := v_net + v_tax;
    if v_gross <= 0 then
      raise exception 'invoice gross must be > 0';
    end if;

    v_revenue := public._nl_revenue_account(v_group.vat_rate);
    v_ust := public._nl_ust_account(v_group.vat_rate);

    if not exists (
      select 1 from public.accounts a
      where a.organization_id = p_organization_id and a.number = v_revenue
        and a.account_type = 'ertrag'
    ) then
      raise exception 'revenue account % missing or not ertrag', v_revenue;
    end if;

    if v_group_count = 1 then
      v_doc_number := v_inv.number;
    else
      v_doc_number := v_inv.number || '-U' || v_group.vat_rate::text;
    end if;

    v_desc := format(
      'Ausgangsrechnung %s an %s',
      v_inv.number,
      v_customer_name
    );

    insert into public.journal_entries (
      organization_id, entry_date, document_number, description,
      debit_account, credit_account, net_amount_cents, vat_rate,
      tax_amount_cents, gross_amount_cents, explanation
    ) values (
      p_organization_id, v_inv.issue_date, v_doc_number, v_desc,
      '1400', v_revenue, v_net, v_group.vat_rate,
      v_tax, v_gross,
      format('AR %s USt %s%%', v_inv.number, v_group.vat_rate)
    )
    returning id into v_entry_id;

    if v_first_entry_id is null then
      v_first_entry_id := v_entry_id;
    end if;

    -- Lines: revenue with VAT → Debit AR gross, Credit revenue net, Credit USt tax
    if v_group.vat_rate in (7, 19) then
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, '1400', v_gross, 0),
        (p_organization_id, v_entry_id, v_revenue, 0, v_net),
        (p_organization_id, v_entry_id, v_ust, 0, v_tax);
    else
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, '1400', v_net, 0),
        (p_organization_id, v_entry_id, v_revenue, 0, v_net);
    end if;

    insert into public.document_journal_links (
      organization_id, document_type, document_id, journal_entry_id
    ) values (
      p_organization_id, 'sales_invoice', p_invoice_id, v_entry_id
    );
  end loop;

  if v_first_entry_id is null then
    raise exception 'invoice has no lines';
  end if;

  -- Stock outflows for products that track stock
  for v_line in
    select l.product_id, l.quantity, l.description
    from public.sales_invoice_lines l
    where l.organization_id = p_organization_id
      and l.invoice_id = p_invoice_id
      and l.product_id is not null
  loop
    select p.tracks_stock into v_tracks
    from public.products p
    where p.id = v_line.product_id and p.organization_id = p_organization_id;

    if coalesce(v_tracks, false) then
      insert into public.stock_movements (
        organization_id, product_id, movement_date, quantity_delta,
        source_type, source_id, note
      ) values (
        p_organization_id, v_line.product_id, v_inv.issue_date, -v_line.quantity,
        'verkauf', p_invoice_id::text, v_inv.number
      );
    end if;
  end loop;

  update public.sales_invoices
  set booked_at = now(), updated_at = now()
  where id = p_invoice_id and organization_id = p_organization_id
    and booked_at is null;

  if not found then
    raise exception 'already_booked: sales invoice %', p_invoice_id;
  end if;

  return v_first_entry_id;
end;
$$;

comment on function public.book_sales_invoice(uuid, uuid) is
  'Books sales invoice: USt groups, journal+lines+links+stock, sets booked_at. Returns first journal_entry id.';

-- ---------------------------------------------------------------------------
-- book_vendor_invoice
-- ---------------------------------------------------------------------------
create or replace function public.book_vendor_invoice(
  p_organization_id uuid,
  p_invoice_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.vendor_invoices%rowtype;
  v_supplier_name text;
  v_group record;
  v_group_count int;
  v_net int;
  v_tax int;
  v_gross int;
  v_vst text;
  v_entry_id uuid;
  v_first_entry_id uuid;
  v_doc_number text;
  v_desc text;
  v_acct_type text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  select * into v_inv
  from public.vendor_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'vendor invoice not found';
  end if;

  if v_inv.booked_at is not null then
    raise exception 'already_booked: vendor invoice %', p_invoice_id;
  end if;

  select s.company_name into v_supplier_name
  from public.suppliers s
  where s.id = v_inv.supplier_id and s.organization_id = p_organization_id;

  if v_supplier_name is null then
    raise exception 'supplier not found for invoice';
  end if;

  if not exists (
    select 1 from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
  ) then
    raise exception 'invoice has no lines';
  end if;

  -- Validate expense accounts
  for v_group in
    select distinct l.expense_account
    from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
  loop
    select a.account_type into v_acct_type
    from public.accounts a
    where a.organization_id = p_organization_id and a.number = v_group.expense_account;

    if v_acct_type is distinct from 'aufwand' then
      raise exception 'expense account % invalid or not aufwand', v_group.expense_account;
    end if;
  end loop;

  select count(*) into v_group_count
  from (
    select l.expense_account, l.vat_rate
    from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.expense_account, l.vat_rate
  ) g;

  for v_group in
    select
      l.expense_account,
      l.vat_rate,
      sum(public._nl_line_net_cents(l.quantity, l.net_unit_price_cents))::int as net_cents
    from public.vendor_invoice_lines l
    where l.organization_id = p_organization_id and l.invoice_id = p_invoice_id
    group by l.expense_account, l.vat_rate
    order by l.expense_account, l.vat_rate
  loop
    v_net := v_group.net_cents;
    if v_net <= 0 then
      raise exception 'invalid group net for expense % vat %',
        v_group.expense_account, v_group.vat_rate;
    end if;
    v_tax := public._nl_tax_cents(v_net, v_group.vat_rate);
    v_gross := v_net + v_tax;
    v_vst := public._nl_vst_account(v_group.vat_rate);

    if v_group_count = 1 then
      v_doc_number := v_inv.internal_number;
    else
      v_doc_number := v_inv.internal_number
        || '-' || v_group.expense_account
        || '-U' || v_group.vat_rate::text;
    end if;

    v_desc := format(
      'Eingangsrechnung %s von %s',
      v_inv.internal_number,
      v_supplier_name
    );

    insert into public.journal_entries (
      organization_id, entry_date, document_number, description,
      debit_account, credit_account, net_amount_cents, vat_rate,
      tax_amount_cents, gross_amount_cents, explanation
    ) values (
      p_organization_id, v_inv.issue_date, v_doc_number, v_desc,
      v_group.expense_account, '1600', v_net, v_group.vat_rate,
      v_tax, v_gross,
      format('ER %s USt %s%%', v_inv.internal_number, v_group.vat_rate)
    )
    returning id into v_entry_id;

    if v_first_entry_id is null then
      v_first_entry_id := v_entry_id;
    end if;

    if v_group.vat_rate in (7, 19) then
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, v_group.expense_account, v_net, 0),
        (p_organization_id, v_entry_id, v_vst, v_tax, 0),
        (p_organization_id, v_entry_id, '1600', 0, v_gross);
    else
      insert into public.journal_lines (
        organization_id, journal_entry_id, account_number, debit_cents, credit_cents
      ) values
        (p_organization_id, v_entry_id, v_group.expense_account, v_net, 0),
        (p_organization_id, v_entry_id, '1600', 0, v_net);
    end if;

    insert into public.document_journal_links (
      organization_id, document_type, document_id, journal_entry_id
    ) values (
      p_organization_id, 'vendor_invoice', p_invoice_id, v_entry_id
    );
  end loop;

  if v_first_entry_id is null then
    raise exception 'invoice has no lines';
  end if;

  update public.vendor_invoices
  set booked_at = now(), updated_at = now()
  where id = p_invoice_id and organization_id = p_organization_id
    and booked_at is null;

  if not found then
    raise exception 'already_booked: vendor invoice %', p_invoice_id;
  end if;

  return v_first_entry_id;
end;
$$;

comment on function public.book_vendor_invoice(uuid, uuid) is
  'Books vendor invoice: expense+VAT groups, journal+lines+links, sets booked_at. Returns first journal_entry id.';

-- ---------------------------------------------------------------------------
-- record_sales_payment
-- Natural-key idempotency: (invoice_id, payment_date, amount_cents, bank_account, coalesce(reference,''))
-- ---------------------------------------------------------------------------
create or replace function public.record_sales_payment(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_bank_account text,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.sales_invoices%rowtype;
  v_existing uuid;
  v_ref text;
  v_gross int;
  v_paid int;
  v_entry_id uuid;
  v_payment_id uuid;
  v_doc_number text;
  v_desc text;
  v_seq int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  if p_payment_date is null then
    raise exception 'invalid payment date';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'payment amount must be > 0';
  end if;
  if p_bank_account not in ('1200', '1000') then
    raise exception 'invalid bank account';
  end if;

  v_ref := coalesce(p_reference, '');

  select * into v_inv
  from public.sales_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'sales invoice not found';
  end if;

  if v_inv.booked_at is null then
    raise exception 'sales payment requires booked invoice';
  end if;

  -- Idempotent retry
  select p.id into v_existing
  from public.sales_payments p
  where p.organization_id = p_organization_id
    and p.invoice_id = p_invoice_id
    and p.payment_date = p_payment_date
    and p.amount_cents = p_amount_cents
    and p.bank_account = p_bank_account
    and coalesce(p.reference, '') = v_ref
  order by p.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_gross := public.sales_invoice_gross_cents(p_organization_id, p_invoice_id);
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.sales_payments
  where organization_id = p_organization_id and invoice_id = p_invoice_id;

  if v_paid + p_amount_cents > v_gross then
    raise exception 'sales payment overpays invoice (paid=% + % > gross=%)',
      v_paid, p_amount_cents, v_gross;
  end if;

  v_seq := public.next_document_number(p_organization_id, 'journal');
  v_doc_number := format('ZE-%s-%s', v_inv.number, v_seq);
  v_desc := nullif(trim(v_ref), '');
  if v_desc is null then
    v_desc := format('Zahlungseingang zu %s', v_inv.number);
  end if;

  insert into public.journal_entries (
    organization_id, entry_date, document_number, description,
    debit_account, credit_account, net_amount_cents, vat_rate,
    tax_amount_cents, gross_amount_cents, explanation
  ) values (
    p_organization_id, p_payment_date, v_doc_number, v_desc,
    p_bank_account, '1400', p_amount_cents, 0,
    0, p_amount_cents,
    format('ZE %s', v_inv.number)
  )
  returning id into v_entry_id;

  insert into public.journal_lines (
    organization_id, journal_entry_id, account_number, debit_cents, credit_cents
  ) values
    (p_organization_id, v_entry_id, p_bank_account, p_amount_cents, 0),
    (p_organization_id, v_entry_id, '1400', 0, p_amount_cents);

  insert into public.sales_payments (
    organization_id, invoice_id, payment_date, amount_cents,
    bank_account, reference, journal_entry_id
  ) values (
    p_organization_id, p_invoice_id, p_payment_date, p_amount_cents,
    p_bank_account, nullif(v_ref, ''), v_entry_id
  )
  returning id into v_payment_id;

  insert into public.document_journal_links (
    organization_id, document_type, document_id, journal_entry_id
  ) values (
    p_organization_id, 'sales_payment', v_payment_id, v_entry_id
  );

  return v_payment_id;
end;
$$;

comment on function public.record_sales_payment(uuid, uuid, date, int, text, text) is
  'Atomic sales payment + journal + link. Idempotent on natural key. Returns payment id.';

-- ---------------------------------------------------------------------------
-- record_vendor_payment
-- ---------------------------------------------------------------------------
create or replace function public.record_vendor_payment(
  p_organization_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount_cents int,
  p_bank_account text,
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.vendor_invoices%rowtype;
  v_existing uuid;
  v_ref text;
  v_gross int;
  v_paid int;
  v_entry_id uuid;
  v_payment_id uuid;
  v_doc_number text;
  v_desc text;
  v_seq int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;

  if p_payment_date is null then
    raise exception 'invalid payment date';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'payment amount must be > 0';
  end if;
  if p_bank_account not in ('1200', '1000') then
    raise exception 'invalid bank account';
  end if;

  v_ref := coalesce(p_reference, '');

  select * into v_inv
  from public.vendor_invoices
  where id = p_invoice_id and organization_id = p_organization_id
  for update;

  if not found then
    raise exception 'vendor invoice not found';
  end if;

  if v_inv.booked_at is null then
    raise exception 'vendor payment requires booked invoice';
  end if;

  select p.id into v_existing
  from public.vendor_payments p
  where p.organization_id = p_organization_id
    and p.invoice_id = p_invoice_id
    and p.payment_date = p_payment_date
    and p.amount_cents = p_amount_cents
    and p.bank_account = p_bank_account
    and coalesce(p.reference, '') = v_ref
  order by p.created_at
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  v_gross := public.vendor_invoice_gross_cents(p_organization_id, p_invoice_id);
  select coalesce(sum(amount_cents), 0) into v_paid
  from public.vendor_payments
  where organization_id = p_organization_id and invoice_id = p_invoice_id;

  if v_paid + p_amount_cents > v_gross then
    raise exception 'vendor payment overpays invoice (paid=% + % > gross=%)',
      v_paid, p_amount_cents, v_gross;
  end if;

  v_seq := public.next_document_number(p_organization_id, 'journal');
  v_doc_number := format('ZA-%s-%s', v_inv.internal_number, v_seq);
  v_desc := nullif(trim(v_ref), '');
  if v_desc is null then
    v_desc := format('Zahlungsausgang zu %s', v_inv.internal_number);
  end if;

  insert into public.journal_entries (
    organization_id, entry_date, document_number, description,
    debit_account, credit_account, net_amount_cents, vat_rate,
    tax_amount_cents, gross_amount_cents, explanation
  ) values (
    p_organization_id, p_payment_date, v_doc_number, v_desc,
    '1600', p_bank_account, p_amount_cents, 0,
    0, p_amount_cents,
    format('ZA %s', v_inv.internal_number)
  )
  returning id into v_entry_id;

  insert into public.journal_lines (
    organization_id, journal_entry_id, account_number, debit_cents, credit_cents
  ) values
    (p_organization_id, v_entry_id, '1600', p_amount_cents, 0),
    (p_organization_id, v_entry_id, p_bank_account, 0, p_amount_cents);

  insert into public.vendor_payments (
    organization_id, invoice_id, payment_date, amount_cents,
    bank_account, reference, journal_entry_id
  ) values (
    p_organization_id, p_invoice_id, p_payment_date, p_amount_cents,
    p_bank_account, nullif(v_ref, ''), v_entry_id
  )
  returning id into v_payment_id;

  insert into public.document_journal_links (
    organization_id, document_type, document_id, journal_entry_id
  ) values (
    p_organization_id, 'vendor_payment', v_payment_id, v_entry_id
  );

  return v_payment_id;
end;
$$;

comment on function public.record_vendor_payment(uuid, uuid, date, int, text, text) is
  'Atomic vendor payment + journal + link. Idempotent on natural key. Returns payment id.';

-- ---------------------------------------------------------------------------
-- EXECUTE grants for the five core RPCs
-- ---------------------------------------------------------------------------
revoke all on function public.next_document_number(uuid, text) from public, anon;
revoke all on function public.book_sales_invoice(uuid, uuid) from public, anon;
revoke all on function public.book_vendor_invoice(uuid, uuid) from public, anon;
revoke all on function public.record_sales_payment(uuid, uuid, date, int, text, text) from public, anon;
revoke all on function public.record_vendor_payment(uuid, uuid, date, int, text, text) from public, anon;

grant execute on function public.next_document_number(uuid, text) to authenticated;
grant execute on function public.book_sales_invoice(uuid, uuid) to authenticated;
grant execute on function public.book_vendor_invoice(uuid, uuid) to authenticated;
grant execute on function public.record_sales_payment(uuid, uuid, date, int, text, text) to authenticated;
grant execute on function public.record_vendor_payment(uuid, uuid, date, int, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Phase 2: revoke direct client writes on booking-owned tables
-- DEFINER RPCs use owner privileges and are unaffected.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on table
  public.journal_entries,
  public.journal_lines,
  public.document_journal_links,
  public.sales_payments,
  public.vendor_payments,
  public.stock_movements
from authenticated;
-- SELECT remains from grants_v1
