-- Payment idempotency hardening tests (local PostgreSQL only — never remote).
-- Requires: fixtures from 10_*, booking RPCs from 20_*, migration payment_idempotency_v1.
-- Covers: identical retries, Teilzahlungen, distinct same-invoice payments,
-- NULL/'' reference coalescing, unique-index enforcement, catalog presence.
-- Parallel same-key stress is driven from run_local_review.sh (two psql sessions).

drop table if exists public.payment_idempotency_results;
create table public.payment_idempotency_results (
  seq serial primary key,
  case_id text not null,
  ok boolean not null,
  detail text not null
);

create or replace function public.pay_idem_expect(p_case text, p_ok boolean, p_detail text)
returns void
language sql
as $$
  insert into public.payment_idempotency_results (case_id, ok, detail)
  values (p_case, p_ok, p_detail);
$$;

do $$
declare
  org_a uuid;
  cust_a uuid;
  prod_a uuid;
  sup_a uuid;
  inv_ze uuid;
  inv_za uuid;
  inv_parallel uuid;
  pay1 uuid;
  pay2 uuid;
  pay3 uuid;
  pay_null uuid;
  pay_empty uuid;
  n int;
  raised boolean;
  err text;
  idx_sales boolean;
  idx_vendor boolean;
begin
  select id into org_a from public.organizations where slug = 'org-a';
  select id into cust_a from public.customers
  where organization_id = org_a and number = 'K-1' limit 1;
  select id into prod_a from public.products
  where organization_id = org_a and sku = 'RPC-P1' limit 1;
  select id into sup_a from public.suppliers
  where organization_id = org_a and number = 'L-RPC-1' limit 1;

  perform public.pay_idem_expect(
    'FIX_READY',
    org_a is not null and cust_a is not null
      and prod_a is not null and sup_a is not null,
    format('org=%s cust=%s prod=%s sup=%s', org_a, cust_a, prod_a, sup_a)
  );

  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'sales_payments_natural_key_uidx'
  ) into idx_sales;
  select exists (
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'vendor_payments_natural_key_uidx'
  ) into idx_vendor;

  perform public.pay_idem_expect(
    'IDX_SALES_PRESENT', idx_sales, 'sales_payments_natural_key_uidx'
  );
  perform public.pay_idem_expect(
    'IDX_VENDOR_PRESENT', idx_vendor, 'vendor_payments_natural_key_uidx'
  );

  -- ========================================================================
  -- ZE: booked invoice — Teilzahlungen + retries (gross 2380)
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-IDEM-ZE', current_date, current_date + 14, cust_a)
  returning id into inv_ze;

  insert into public.sales_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate
  ) values (org_a, inv_ze, prod_a, 'Ware', 2, 1000, 19);

  perform public.book_sales_invoice(org_a, inv_ze);

  pay1 := public.record_sales_payment(
    org_a, inv_ze, current_date, 500, '280', 'TEIL-A'
  );
  pay2 := public.record_sales_payment(
    org_a, inv_ze, current_date, 800, '280', 'TEIL-B'
  );
  reset role;

  perform public.pay_idem_expect(
    'ZE_TEIL_DISTINCT',
    pay1 is not null and pay2 is not null and pay1 <> pay2,
    format('pay1=%s pay2=%s', pay1, pay2)
  );

  select count(*) into n from public.sales_payments where invoice_id = inv_ze;
  perform public.pay_idem_expect(
    'ZE_TEIL_TWO_ROWS', n = 2, format('rows=%s', n)
  );

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  pay3 := public.record_sales_payment(
    org_a, inv_ze, current_date, 500, '280', 'TEIL-A'
  );
  reset role;

  perform public.pay_idem_expect(
    'ZE_RETRY_SAME_ID',
    pay3 = pay1,
    format('original=%s retry=%s', pay1, pay3)
  );
  select count(*) into n from public.sales_payments where invoice_id = inv_ze;
  perform public.pay_idem_expect(
    'ZE_RETRY_NO_EXTRA_ROW', n = 2, format('rows=%s', n)
  );

  -- Same amount, different reference → distinct payment
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  pay3 := public.record_sales_payment(
    org_a, inv_ze, current_date, 500, '280', 'TEIL-C'
  );
  reset role;

  perform public.pay_idem_expect(
    'ZE_SAME_AMT_DIFF_REF',
    pay3 is not null and pay3 <> pay1,
    format('pay1=%s pay3=%s', pay1, pay3)
  );
  select count(*) into n from public.sales_payments where invoice_id = inv_ze;
  perform public.pay_idem_expect(
    'ZE_THREE_ROWS', n = 3, format('rows=%s', n)
  );

  -- NULL vs '' reference: same natural key after coalesce
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  -- remaining: 2380 - 500 - 800 - 500 = 580
  pay_null := public.record_sales_payment(
    org_a, inv_ze, current_date, 200, '282', null
  );
  pay_empty := public.record_sales_payment(
    org_a, inv_ze, current_date, 200, '282', ''
  );
  reset role;

  perform public.pay_idem_expect(
    'ZE_NULL_EMPTY_COALESCE',
    pay_null = pay_empty,
    format('null_ref=%s empty_ref=%s', pay_null, pay_empty)
  );
  select count(*) into n
  from public.sales_payments
  where invoice_id = inv_ze and amount_cents = 200 and bank_account = '282';
  perform public.pay_idem_expect(
    'ZE_NULL_EMPTY_SINGLE_ROW', n = 1, format('rows=%s', n)
  );

  -- Unique index blocks duplicate natural-key insert (dedicated invoice;
  -- avoids overpay trigger firing before unique_violation on a near-full invoice)
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-IDEM-UQ', current_date, current_date + 14, cust_a)
  returning id into inv_ze;  -- reuse var; prior ZE cases already asserted

  insert into public.sales_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate
  ) values (org_a, inv_ze, prod_a, 'UQ', 1, 1000, 19);

  perform public.book_sales_invoice(org_a, inv_ze);
  pay1 := public.record_sales_payment(
    org_a, inv_ze, current_date, 300, '280', 'UQ-KEY'
  );
  reset role;

  raised := false;
  err := null;
  begin
    insert into public.sales_payments (
      organization_id, invoice_id, payment_date, amount_cents,
      bank_account, reference
    ) values (
      org_a, inv_ze, current_date, 300, '280', 'UQ-KEY'
    );
  exception when unique_violation then
    raised := true;
    err := sqlerrm;
  end;

  perform public.pay_idem_expect(
    'ZE_UNIQUE_BLOCKS_DUP',
    raised and pay1 is not null,
    coalesce(err, 'no unique_violation')
  );

  -- ========================================================================
  -- ZA: vendor mirror (gross 1190)
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.vendor_invoices (
    organization_id, external_number, internal_number, supplier_id,
    issue_date, due_date
  ) values (org_a, 'EXT-IDEM', 'ER-IDEM-ZA', sup_a, current_date, current_date + 14)
  returning id into inv_za;

  insert into public.vendor_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate, expense_account
  ) values (org_a, inv_za, prod_a, 'Ware', 1, 1000, 19, '608');

  perform public.book_vendor_invoice(org_a, inv_za);

  pay1 := public.record_vendor_payment(
    org_a, inv_za, current_date, 400, '280', 'ZA-TEIL-1'
  );
  pay2 := public.record_vendor_payment(
    org_a, inv_za, current_date, 390, '280', 'ZA-TEIL-2'
  );
  pay3 := public.record_vendor_payment(
    org_a, inv_za, current_date, 400, '280', 'ZA-TEIL-1'
  );
  reset role;

  perform public.pay_idem_expect(
    'ZA_TEIL_AND_RETRY',
    pay1 is not null and pay2 is not null and pay1 <> pay2 and pay3 = pay1,
    format('p1=%s p2=%s retry=%s', pay1, pay2, pay3)
  );

  select count(*) into n from public.vendor_payments where invoice_id = inv_za;
  perform public.pay_idem_expect(
    'ZA_TWO_ROWS', n = 2, format('rows=%s', n)
  );

  -- Dedicated vendor invoice for unique-index dup (room under gross)
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.vendor_invoices (
    organization_id, external_number, internal_number, supplier_id,
    issue_date, due_date
  ) values (org_a, 'EXT-IDEM-UQ', 'ER-IDEM-UQ', sup_a, current_date, current_date + 14)
  returning id into inv_za;

  insert into public.vendor_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate, expense_account
  ) values (org_a, inv_za, prod_a, 'UQ', 1, 1000, 19, '608');

  perform public.book_vendor_invoice(org_a, inv_za);
  pay1 := public.record_vendor_payment(
    org_a, inv_za, current_date, 300, '280', 'ZA-UQ-KEY'
  );
  reset role;

  raised := false;
  err := null;
  begin
    insert into public.vendor_payments (
      organization_id, invoice_id, payment_date, amount_cents,
      bank_account, reference
    ) values (
      org_a, inv_za, current_date, 300, '280', 'ZA-UQ-KEY'
    );
  exception when unique_violation then
    raised := true;
    err := sqlerrm;
  end;

  perform public.pay_idem_expect(
    'ZA_UNIQUE_BLOCKS_DUP',
    raised and pay1 is not null,
    coalesce(err, 'no unique_violation')
  );

  -- Seed row for bash parallel stress (invoice booked, no payments yet)
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-IDEM-PAR', current_date, current_date + 14, cust_a)
  returning id into inv_parallel;

  insert into public.sales_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate
  ) values (org_a, inv_parallel, prod_a, 'Parallel', 1, 1000, 19);

  perform public.book_sales_invoice(org_a, inv_parallel);
  reset role;

  drop table if exists public._pay_idem_parallel_seed;
  create table public._pay_idem_parallel_seed (
    organization_id uuid not null,
    invoice_id uuid not null,
    payment_date date not null,
    amount_cents int not null,
    bank_account text not null,
    reference text not null
  );
  insert into public._pay_idem_parallel_seed values (
    org_a, inv_parallel, current_date, 500, '280', 'PAR-STRESS'
  );

  perform public.pay_idem_expect(
    'PARALLEL_SEED',
    inv_parallel is not null,
    format('invoice=%s', inv_parallel)
  );

end $$;

select case_id, ok, detail from public.payment_idempotency_results order by seq;
select
  count(*) filter (where ok) as passed,
  count(*) filter (where not ok) as failed,
  count(*) as total
from public.payment_idempotency_results;
