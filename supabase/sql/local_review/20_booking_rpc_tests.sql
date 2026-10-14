-- Phase 3: booking RPC tests (local PostgreSQL only — never remote).
-- Depends on 10_fixtures_and_negative_tests.sql having created orgs/users/customers.
-- Uses a separate results table so counts stay independent.

drop table if exists public.booking_rpc_results;
create table public.booking_rpc_results (
  seq serial primary key,
  case_id text not null,
  ok boolean not null,
  detail text not null
);

create or replace function public.booking_expect(p_case text, p_ok boolean, p_detail text)
returns void
language sql
as $$
  insert into public.booking_rpc_results (case_id, ok, detail) values (p_case, p_ok, p_detail);
$$;

do $$
declare
  org_a uuid;
  org_b uuid;
  cust_a uuid;
  prod_a uuid;
  prod_b uuid;
  inv_ar uuid;
  inv_ar2 uuid;
  inv_ar_empty uuid;
  inv_ar_tax uuid;
  inv_er uuid;
  inv_er_bad uuid;
  sup_a uuid;
  je uuid;
  je2 uuid;
  pay_id uuid;
  pay_id2 uuid;
  n int;
  raised boolean;
  err text;
  v_gross_helper int;
  v_gross_group int;
  v_net int;
  v_tax int;
  v_seq1 int;
  v_seq2 int;
  v_booked timestamptz;
  v_links int;
  v_stock int;
  v_pay_count int;
  v_je_count_before int;
  v_je_count_after int;
begin
  select id into org_a from public.organizations where slug = 'org-a';
  select id into org_b from public.organizations where slug = 'org-b';
  select id into cust_a from public.customers
  where organization_id = org_a and number = 'K-1' limit 1;

  perform public.booking_expect(
    'FIX_ORGS',
    org_a is not null and org_b is not null and cust_a is not null,
    format('org_a=%s org_b=%s cust=%s', org_a, org_b, cust_a)
  );

  -- Fresh product + supplier as student (can_write_org)
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.products (
    organization_id, sku, name, net_unit_price_cents, net_purchase_price_cents,
    vat_rate, tracks_stock
  ) values (org_a, 'RPC-P1', 'RPC Produkt', 1000, 500, 19, true)
  returning id into prod_a;

  insert into public.products (
    organization_id, sku, name, net_unit_price_cents, net_purchase_price_cents,
    vat_rate, tracks_stock
  ) values (org_a, 'RPC-P2', 'RPC Produkt 7%', 2000, 800, 7, false)
  returning id into prod_b;

  insert into public.suppliers (
    organization_id, number, company_name, billing_address
  ) values (org_a, 'L-RPC-1', 'Lieferant RPC', 'Addr')
  returning id into sup_a;

  -- -------- next_document_number success + monotonic --------
  v_seq1 := public.next_document_number(org_a, 'sales_invoice');
  v_seq2 := public.next_document_number(org_a, 'sales_invoice');
  reset role;
  perform public.booking_expect(
    'SEQ_NEXT',
    v_seq2 = v_seq1 + 1 and v_seq1 >= 1,
    format('seq1=%s seq2=%s', v_seq1, v_seq2)
  );

  -- -------- teacher forbidden on next_document_number --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  set role authenticated;
  raised := false;
  begin
    perform public.next_document_number(org_a, 'journal');
  exception when others then
    raised := (sqlerrm ilike '%forbidden%');
  end;
  reset role;
  perform public.booking_expect('SEQ_TEACHER_FORBIDDEN', raised, 'teacher sequence denied');

  -- -------- anon forbidden --------
  set role anon;
  raised := false;
  begin
    perform public.book_sales_invoice(org_a, '00000000-0000-0000-0000-000000000001');
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.booking_expect('ANON_BOOK_DENIED', raised, 'anon book denied');

  -- -------- outsider forbidden --------
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', false);
  -- outsider was added as student on org_a in fixtures — use owner-b instead
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  set role authenticated;
  raised := false;
  begin
    perform public.book_sales_invoice(org_a, '00000000-0000-0000-0000-000000000001');
  exception when others then
    raised := (sqlerrm ilike '%forbidden%');
  end;
  reset role;
  perform public.booking_expect('OUTSIDER_ORG_B_FORBIDDEN', raised, 'owner-b cannot book org-a');

  -- ========================================================================
  -- AR success path
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-RPC-1', current_date, current_date + 14, cust_a)
  returning id into inv_ar;

  insert into public.sales_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate
  ) values (org_a, inv_ar, prod_a, 'Pos 19%', 2, 1000, 19);

  je := public.book_sales_invoice(org_a, inv_ar);
  reset role;

  select booked_at into v_booked from public.sales_invoices where id = inv_ar;
  select count(*) into v_links from public.document_journal_links
  where document_id = inv_ar and document_type = 'sales_invoice';
  select count(*) into v_stock from public.stock_movements
  where source_id = inv_ar::text and source_type = 'verkauf';

  perform public.booking_expect(
    'AR_BOOK_OK',
    je is not null and v_booked is not null and v_links = 1 and v_stock = 1,
    format('je=%s booked=%s links=%s stock=%s', je, v_booked, v_links, v_stock)
  );

  -- Verify journal balance for the entry
  select
    coalesce(sum(debit_cents), 0) = coalesce(sum(credit_cents), 0)
  into raised
  from public.journal_lines where journal_entry_id = je;
  perform public.booking_expect('AR_JOURNAL_BALANCED', raised, 'AR journal soll=haben');

  -- Double book → already_booked
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  begin
    perform public.book_sales_invoice(org_a, inv_ar);
  exception when others then
    raised := (sqlerrm ilike '%already_booked%');
    err := sqlerrm;
  end;
  reset role;
  perform public.booking_expect('AR_DOUBLE_BOOK', raised, coalesce(err, 'no error'));

  -- Booked immutability: line update blocked
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  n := -1;
  begin
    update public.sales_invoice_lines set quantity = 99
    where invoice_id = inv_ar;
    get diagnostics n = row_count;
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.booking_expect(
    'AR_BOOKED_IMMUTABLE',
    raised or n = 0,
    format('raised=%s row_count=%s', raised, n)
  );

  -- ========================================================================
  -- AR payment success + retry idempotency
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  pay_id := public.record_sales_payment(
    org_a, inv_ar, current_date, 500, '1200', 'RPC-PAY-1'
  );
  pay_id2 := public.record_sales_payment(
    org_a, inv_ar, current_date, 500, '1200', 'RPC-PAY-1'
  );
  reset role;

  perform public.booking_expect(
    'AR_PAY_OK',
    pay_id is not null,
    format('pay=%s', pay_id)
  );
  perform public.booking_expect(
    'AR_PAY_IDEMPOTENT',
    pay_id = pay_id2,
    format('first=%s second=%s', pay_id, pay_id2)
  );

  select count(*) into v_pay_count from public.sales_payments where invoice_id = inv_ar;
  perform public.booking_expect(
    'AR_PAY_SINGLE_ROW',
    v_pay_count = 1,
    format('payment rows=%s', v_pay_count)
  );

  -- Overpay rejected
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  begin
    -- AR-RPC-1: 2*1000 net + 19% = 2380 gross; paid 500; remaining 1880
    perform public.record_sales_payment(
      org_a, inv_ar, current_date, 99999, '1200', 'OVER'
    );
  exception when others then
    raised := true;
    err := sqlerrm;
  end;
  reset role;
  perform public.booking_expect('AR_PAY_OVERPAY', raised, coalesce(err, 'no error'));

  -- Teacher cannot record payment
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  set role authenticated;
  raised := false;
  begin
    perform public.record_sales_payment(
      org_a, inv_ar, current_date, 100, '1200', 'T'
    );
  exception when others then
    raised := (sqlerrm ilike '%forbidden%');
  end;
  reset role;
  perform public.booking_expect('AR_PAY_TEACHER_FORBIDDEN', raised, 'teacher payment denied');

  -- ========================================================================
  -- Empty lines / invalid book
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-RPC-EMPTY', current_date, current_date + 14, cust_a)
  returning id into inv_ar_empty;

  raised := false;
  begin
    perform public.book_sales_invoice(org_a, inv_ar_empty);
  exception when others then
    raised := (sqlerrm ilike '%no lines%');
    err := sqlerrm;
  end;
  reset role;
  perform public.booking_expect('AR_EMPTY_LINES', raised, coalesce(err, 'no error'));

  select booked_at into v_booked from public.sales_invoices where id = inv_ar_empty;
  perform public.booking_expect(
    'AR_EMPTY_NO_PARTIAL',
    v_booked is null,
    format('booked_at=%s', v_booked)
  );

  -- ========================================================================
  -- Tax 0/7/19 + rounding vs gross helper
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-RPC-TAX', current_date, current_date + 14, cust_a)
  returning id into inv_ar_tax;

  -- Fractional qty same VAT — group tax (client) may diverge from per-line gross helper
  insert into public.sales_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate
  ) values
    (org_a, inv_ar_tax, prod_a, 'A', 1.1, 1999, 19),
    (org_a, inv_ar_tax, prod_a, 'B', 2.3, 1999, 19),
    (org_a, inv_ar_tax, prod_b, 'C7', 1, 1000, 7),
    (org_a, inv_ar_tax, null, 'Free', 1, 500, 0);

  je := public.book_sales_invoice(org_a, inv_ar_tax);
  reset role;

  select count(*) into v_links from public.document_journal_links
  where document_id = inv_ar_tax and document_type = 'sales_invoice';

  -- Group nets: 19% = round(1.1*1999)+round(2.3*1999)=2199+4598=6797; tax=round(6797*0.19)=1291
  -- 7% = 1000; tax=70; 0% = 500; tax=0 → journal gross sum = 6797+1291+1000+70+500 = 9658
  select coalesce(sum(gross_amount_cents), 0) into v_gross_group
  from public.journal_entries je
  join public.document_journal_links d
    on d.journal_entry_id = je.id and d.document_type = 'sales_invoice'
  where d.document_id = inv_ar_tax;

  v_gross_helper := public.sales_invoice_gross_cents(org_a, inv_ar_tax);

  perform public.booking_expect(
    'AR_MULTI_VAT_LINKS',
    v_links = 3 and je is not null,
    format('links=%s first_je=%s', v_links, je)
  );
  perform public.booking_expect(
    'AR_GROUP_GROSS',
    v_gross_group = 9658,
    format('group_gross=%s', v_gross_group)
  );
  -- Document relationship: helper uses per-line round(qty*price*(1+vat/100))
  perform public.booking_expect(
    'AR_GROSS_HELPER_NOTED',
    v_gross_helper > 0,
    format('helper_gross=%s group_gross=%s diverge=%s',
      v_gross_helper, v_gross_group, v_gross_helper is distinct from v_gross_group)
  );

  -- ========================================================================
  -- Mid-txn rollback: invalid expense account on vendor book
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.vendor_invoices (
    organization_id, external_number, internal_number, supplier_id,
    issue_date, due_date
  ) values (org_a, 'EXT-BAD', 'ER-RPC-BAD', sup_a, current_date, current_date + 14)
  returning id into inv_er_bad;

  insert into public.vendor_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate, expense_account
  ) values (org_a, inv_er_bad, prod_a, 'Bad acct', 1, 1000, 19, '1400');
  -- 1400 is aktiv/Forderungen, not aufwand

  select count(*) into v_je_count_before from public.journal_entries
  where organization_id = org_a;

  raised := false;
  begin
    perform public.book_vendor_invoice(org_a, inv_er_bad);
  exception when others then
    raised := (sqlerrm ilike '%aufwand%' or sqlerrm ilike '%invalid%');
    err := sqlerrm;
  end;
  reset role;

  select count(*) into v_je_count_after from public.journal_entries
  where organization_id = org_a;
  select booked_at into v_booked from public.vendor_invoices where id = inv_er_bad;

  perform public.booking_expect(
    'ER_BAD_ACCOUNT_ROLLBACK',
    raised and v_booked is null and v_je_count_after = v_je_count_before,
    format('raised=%s booked=%s je_before=%s je_after=%s err=%s',
      raised, v_booked, v_je_count_before, v_je_count_after, err)
  );

  -- ========================================================================
  -- ER success + payment
  -- ========================================================================
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;

  insert into public.vendor_invoices (
    organization_id, external_number, internal_number, supplier_id,
    issue_date, due_date
  ) values (org_a, 'EXT-1', 'ER-RPC-1', sup_a, current_date, current_date + 14)
  returning id into inv_er;

  insert into public.vendor_invoice_lines (
    organization_id, invoice_id, product_id, description,
    quantity, net_unit_price_cents, vat_rate, expense_account
  ) values (org_a, inv_er, prod_a, 'Ware', 1, 1000, 19, '3400');

  je := public.book_vendor_invoice(org_a, inv_er);

  pay_id := public.record_vendor_payment(
    org_a, inv_er, current_date, 1190, '1200', 'ER-PAY'
  );
  pay_id2 := public.record_vendor_payment(
    org_a, inv_er, current_date, 1190, '1200', 'ER-PAY'
  );
  reset role;

  select booked_at into v_booked from public.vendor_invoices where id = inv_er;
  perform public.booking_expect(
    'ER_BOOK_OK',
    je is not null and v_booked is not null,
    format('je=%s booked=%s', je, v_booked)
  );
  perform public.booking_expect(
    'ER_PAY_IDEMPOTENT',
    pay_id is not null and pay_id = pay_id2,
    format('pay=%s retry=%s', pay_id, pay_id2)
  );

  -- Cross-org: student-a cannot book org-b invoice
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  set role authenticated;
  insert into public.customers (organization_id, number, company_name, billing_address)
  values (org_b, 'K-RPC', 'Kunde B RPC', 'Addr')
  on conflict do nothing;
  -- need a customer id for org_b
  reset role;

  -- Invalid amount payment
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  begin
    perform public.record_sales_payment(
      org_a, inv_ar, current_date, 0, '1200', 'ZERO'
    );
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.booking_expect('PAY_ZERO_AMOUNT', raised, 'zero amount rejected');

  -- Unbalanced / invalid: payment on unbooked invoice
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-RPC-UNBOOKED', current_date, current_date + 14, cust_a)
  returning id into inv_ar2;
  insert into public.sales_invoice_lines (
    organization_id, invoice_id, description, quantity, net_unit_price_cents, vat_rate
  ) values (org_a, inv_ar2, 'X', 1, 100, 19);

  raised := false;
  begin
    perform public.record_sales_payment(
      org_a, inv_ar2, current_date, 50, '1200', 'EARLY'
    );
  exception when others then
    raised := (sqlerrm ilike '%booked%');
    err := sqlerrm;
  end;
  reset role;
  perform public.booking_expect('PAY_REQUIRES_BOOKED', raised, coalesce(err, 'no error'));

  -- Direct journal insert still revoked for authenticated
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  begin
    insert into public.sales_payments (
      organization_id, invoice_id, payment_date, amount_cents, bank_account
    ) values (org_a, inv_ar, current_date, 1, '1200');
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.booking_expect(
    'PAY_NO_DIRECT_INSERT',
    raised,
    'authenticated cannot insert sales_payments directly'
  );

  -- Mid-txn rollback: collide on second USt-group document_number after first insert
  insert into public.journal_entries (
    organization_id, entry_date, document_number, description,
    debit_account, credit_account, net_amount_cents, vat_rate,
    tax_amount_cents, gross_amount_cents
  ) values (
    org_a, current_date, 'AR-RPC-MID-U7', 'blocker',
    '1400', '8300', 100, 7, 7, 107
  );

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-RPC-MID', current_date, current_date + 14, cust_a)
  returning id into inv_ar2;

  insert into public.sales_invoice_lines (
    organization_id, invoice_id, description, quantity, net_unit_price_cents, vat_rate
  ) values
    (org_a, inv_ar2, '19%', 1, 1000, 19),
    (org_a, inv_ar2, '7%', 1, 1000, 7);

  select count(*) into v_je_count_before from public.journal_entries
  where organization_id = org_a;
  select count(*) into v_links from public.document_journal_links
  where document_id = inv_ar2;

  raised := false;
  begin
    perform public.book_sales_invoice(org_a, inv_ar2);
  exception when others then
    raised := true;
    err := sqlerrm;
  end;
  reset role;

  select count(*) into v_je_count_after from public.journal_entries
  where organization_id = org_a;
  select booked_at into v_booked from public.sales_invoices where id = inv_ar2;
  select count(*) into n from public.document_journal_links where document_id = inv_ar2;

  perform public.booking_expect(
    'AR_MIDTXN_ROLLBACK',
    raised and v_booked is null and n = 0 and v_je_count_after = v_je_count_before,
    format('raised=%s booked=%s links=%s je_before=%s je_after=%s err=%s',
      raised, v_booked, n, v_je_count_before, v_je_count_after, err)
  );

end $$;

-- Summary
select case_id, ok, detail from public.booking_rpc_results order by seq;
select
  count(*) filter (where ok) as passed,
  count(*) filter (where not ok) as failed,
  count(*) as total
from public.booking_rpc_results;
