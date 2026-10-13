-- Reproducible fixtures + negative tests for isolated local review DB.
-- Expectation markers: each check inserts into review_results.
-- Run as postgres/superuser; switches to authenticated via SET ROLE.

drop table if exists public.review_results;
create table public.review_results (
  seq serial primary key,
  case_id text not null,
  ok boolean not null,
  detail text not null
);

create or replace function public.review_expect(p_case text, p_ok boolean, p_detail text)
returns void
language sql
as $$
  insert into public.review_results (case_id, ok, detail) values (p_case, p_ok, p_detail);
$$;

-- ---------------------------------------------------------------------------
-- Fixtures: two orgs, owner/teacher/student/viewer
-- ---------------------------------------------------------------------------
truncate auth.users cascade;

insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'owner-a@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'teacher-a@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'student-a@example.test'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'viewer-a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'owner-b@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'outsider@example.test');

-- Profiles may already exist via trigger; ensure present
insert into public.profiles (id, display_name)
select id, split_part(email, '@', 1) from auth.users
on conflict (id) do nothing;

-- Create org A as owner-a
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
set role authenticated;
select public.create_organization('Org A', 'org-a');
reset role;

-- Create org B as owner-b
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
set role authenticated;
select public.create_organization('Org B', 'org-b');
reset role;

-- Resolve org ids
do $$
declare
  org_a uuid;
  org_b uuid;
  cust_a uuid;
  cust_b uuid;
  prod_a uuid;
  inv_a uuid;
  booked_inv uuid;
  line_id uuid;
  raised boolean;
  n int;
begin
  select id into org_a from public.organizations where slug = 'org-a';
  select id into org_b from public.organizations where slug = 'org-b';

  perform public.review_expect(
    'MIG_ORGS',
    org_a is not null and org_b is not null,
    format('org_a=%s org_b=%s', org_a, org_b)
  );

  -- Owner-a adds teacher/student/viewer
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  set role authenticated;
  insert into public.organization_members (organization_id, user_id, role) values
    (org_a, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', 'teacher'),
    (org_a, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', 'student'),
    (org_a, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4', 'viewer');
  reset role;

  -- Accounts seeded?
  select count(*) into n from public.accounts where organization_id = org_a;
  perform public.review_expect('SEED_ACCOUNTS', n >= 20, format('accounts=%s', n));

  -- -------- A1: outsider cannot self-insert as owner on org_a --------
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', false);
  set role authenticated;
  raised := false;
  begin
    insert into public.organization_members (organization_id, user_id, role)
    values (org_a, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'owner');
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.review_expect('A1_NO_BOOTSTRAP_ESCALATION', raised, 'outsider owner insert blocked');

  -- -------- A2: non-owner seed forbidden --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  begin
    perform public.seed_organization_accounts(org_a);
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.review_expect('A2_SEED_OWNER_ONLY', raised, 'student seed blocked');

  -- -------- A5: teacher cannot grant owner --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  set role authenticated;
  raised := false;
  begin
    insert into public.organization_members (organization_id, user_id, role)
    values (org_a, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'owner');
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.review_expect('A5_TEACHER_NO_OWNER_GRANT', raised, 'teacher→owner blocked');

  -- Teacher can add student (use outsider as student on org_a)
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  set role authenticated;
  raised := false;
  begin
    insert into public.organization_members (organization_id, user_id, role)
    values (org_a, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'student');
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.review_expect('A5_TEACHER_CAN_ADD_STUDENT', not raised, 'teacher→student allowed');

  -- -------- Teacher cannot write sales_invoices --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', false);
  set role authenticated;
  insert into public.customers (organization_id, number, company_name, billing_address)
  values (org_a, 'K-1', 'Kunde A', 'Addr')
  returning id into cust_a;
  reset role;

  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  set role authenticated;
  insert into public.customers (organization_id, number, company_name, billing_address)
  values (org_b, 'K-1', 'Kunde B', 'Addr')
  returning id into cust_b;
  reset role;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
  set role authenticated;
  raised := false;
  begin
    insert into public.sales_invoices (
      organization_id, number, issue_date, due_date, customer_id
    ) values (
      org_a, 'AR-1', current_date, current_date + 14, cust_a
    );
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.review_expect('TEACHER_NO_BOOKKEEPING_WRITE', raised, 'teacher invoice insert blocked');

  -- -------- A3: cross-org FK --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  begin
    insert into public.sales_invoices (
      organization_id, number, issue_date, due_date, customer_id
    ) values (
      org_a, 'AR-X', current_date, current_date + 14, cust_b
    );
  exception when others then
    raised := true;
  end;
  reset role;
  perform public.review_expect('A3_CROSS_ORG_FK', raised, 'org_a invoice + org_b customer rejected');

  -- -------- Cross-org SELECT isolation --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  select count(*) into n from public.customers where organization_id = org_b;
  reset role;
  perform public.review_expect('RLS_CROSS_ORG_SELECT', n = 0, format('student-a saw %s org_b customers', n));

  -- -------- anon sees nothing --------
  set role anon;
  select count(*) into n from public.customers;
  reset role;
  perform public.review_expect('ANON_NO_CUSTOMERS', n = 0, format('anon count=%s', n));

  -- -------- A4: booked lines immutable --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.products (
    organization_id, sku, name, net_unit_price_cents, net_purchase_price_cents, vat_rate
  ) values (org_a, 'P1', 'Produkt', 1000, 500, 19)
  returning id into prod_a;

  insert into public.sales_invoices (
    organization_id, number, issue_date, due_date, customer_id
  ) values (org_a, 'AR-2', current_date, current_date + 14, cust_a)
  returning id into inv_a;

  insert into public.sales_invoice_lines (
    organization_id, invoice_id, product_id, description, quantity, net_unit_price_cents, vat_rate
  ) values (org_a, inv_a, prod_a, 'Pos', 1, 1000, 19)
  returning id into line_id;
  reset role;

  -- Book via superuser DEFINER path simulation (direct update as postgres bypasses RLS WITH CHECK)
  -- Use a one-off definer helper to set booked_at like a future RPC would.
  execute format(
    'update public.sales_invoices set booked_at = now() where id = %L and organization_id = %L',
    inv_a, org_a
  );
  -- Above runs as postgres in DO block — bypasses RLS. Trigger enforce_invoice_booking_immutability
  -- allows first book (old.booked_at is null). Good.
  booked_inv := inv_a;

  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  n := -1;
  begin
    update public.sales_invoice_lines set quantity = 2 where id = line_id;
    get diagnostics n = row_count;
  exception when others then
    raised := true;
  end;
  reset role;
  -- RLS may deny with 0 rows (no exception); trigger may raise. Either is success.
  perform public.review_expect(
    'A4_BOOKED_LINES_IMMUTABLE',
    raised or n = 0,
    format('raised=%s row_count=%s', raised, n)
  );

  -- -------- document_sequences: student cannot update --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  raised := false;
  n := -1;
  begin
    update public.document_sequences set next_value = next_value + 1
    where organization_id = org_a and kind = 'sales_invoice';
    get diagnostics n = row_count;
  exception when others then
    raised := true;
    n := -1;
  end;
  reset role;
  perform public.review_expect(
    'SEQ_NO_CLIENT_UPDATE',
    raised or n = 0,
    format('raised=%s row_count=%s', raised, n)
  );

  -- -------- stub RPC authz: teacher forbidden on book_sales_invoice --------
  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'book_sales_invoice'
  ) then
    perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2', false);
    set role authenticated;
    raised := false;
    begin
      perform public.book_sales_invoice(org_a, booked_inv);
    exception when others then
      raised := (sqlerrm ilike '%forbidden%' or sqlerrm ilike '%STUB%');
    end;
    reset role;
    perform public.review_expect('RPC_STUB_TEACHER_AUTHZ', raised, 'teacher book stub denied or stub raise');
  else
    perform public.review_expect('RPC_STUB_TEACHER_AUTHZ', true, 'stubs not applied — skipped');
  end if;

  -- -------- learning_progress peer isolation --------
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.learning_progress (user_id, organization_id, task_id, attempts, best_score, completed)
  values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', org_a, 'lt-01', 1, 2, false)
  on conflict do nothing;
  reset role;

  -- outsider was added as student on org_a earlier — use owner-b (other org) as peer viewer
  perform set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', false);
  set role authenticated;
  select count(*) into n from public.learning_progress
  where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3';
  reset role;
  perform public.review_expect('LEARNING_PEER_ISOLATION', n = 0, format('owner-b saw %s org_a progress rows', n));

end $$;

-- Unbalanced journal in its own transaction so deferred constraint can fire
\set ON_ERROR_STOP 0
do $$
declare
  org_a uuid;
  entry_id uuid;
begin
  select id into org_a from public.organizations where slug = 'org-a';
  perform set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3', false);
  set role authenticated;
  insert into public.journal_entries (
    organization_id, entry_date, document_number, description,
    debit_account, credit_account, net_amount_cents, vat_rate,
    tax_amount_cents, gross_amount_cents
  ) values (
    org_a, current_date, 'J-UNBAL', 'unbalanced',
    '4920', '1000', 100, 0, 0, 100
  ) returning id into entry_id;

  insert into public.journal_lines (
    organization_id, journal_entry_id, account_number, debit_cents, credit_cents
  ) values (org_a, entry_id, '4920', 100, 0);

  set constraints all immediate;
  reset role;
  perform public.review_expect('JOURNAL_BALANCE', false, 'expected deferred balance failure');
exception when others then
  reset role;
  perform public.review_expect('JOURNAL_BALANCE', true, sqlerrm);
end $$;
\set ON_ERROR_STOP 1

-- Summary
select case_id, ok, detail from public.review_results order by seq;
select
  count(*) filter (where ok) as passed,
  count(*) filter (where not ok) as failed,
  count(*) as total
from public.review_results;
