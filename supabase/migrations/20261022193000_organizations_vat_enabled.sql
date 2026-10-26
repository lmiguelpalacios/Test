-- organizations.vat_enabled
-- When false, book_sales_invoice and book_vendor_invoice ignore the rate stored
-- on the unbooked document (treat as 0 %) and write no 1571/1576/1771/1776 lines.
-- Existing journal lines are not rewritten. Default true keeps 0/7/19 behavior.

alter table public.organizations
  add column if not exists vat_enabled boolean not null default true;

comment on column public.organizations.vat_enabled is
  'When false, new sales and vendor invoice bookings omit VAT lines. Historical journal lines stay.';

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
  v_vat_enabled boolean;
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

  select o.vat_enabled into v_vat_enabled
  from public.organizations o
  where o.id = p_organization_id;

  if not found then
    raise exception 'organization not found';
  end if;

  -- Flag wins over the rate on the still-unbooked document. Already booked
  -- invoices returned above, so existing journal lines are not rewritten.
  if not v_vat_enabled then
    update public.sales_invoice_lines
    set vat_rate = 0
    where organization_id = p_organization_id
      and invoice_id = p_invoice_id;
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
  'Books sales invoice. If organizations.vat_enabled is false, line rates are treated as 0 and no USt lines are written. Returns first journal_entry id.';

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
  v_vat_enabled boolean;
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

  select o.vat_enabled into v_vat_enabled
  from public.organizations o
  where o.id = p_organization_id;

  if not found then
    raise exception 'organization not found';
  end if;

  if not v_vat_enabled then
    update public.vendor_invoice_lines
    set vat_rate = 0
    where organization_id = p_organization_id
      and invoice_id = p_invoice_id;
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
  'Books vendor invoice. If organizations.vat_enabled is false, line rates are treated as 0 and no VSt lines are written. Returns first journal_entry id.';
