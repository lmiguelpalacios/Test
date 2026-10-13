-- Nordlicht — executable security checks (NOT a migration)
-- Run on an ISOLATED local/review DB AFTER migrations (+ optional stubs).
-- Never against TrueFuel. Never against production with real pupil data.
-- Expected: sections marked "Expect: 0 rows" return no rows.

-- ===========================================================================
-- 0) Catalog / RLS presence
-- ===========================================================================

-- Expect: 0 rows
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles', 'organizations', 'organization_members', 'account_templates',
    'accounts', 'customers', 'suppliers', 'products', 'sales_invoices',
    'sales_invoice_lines', 'sales_payments', 'purchase_orders',
    'purchase_order_lines', 'goods_receipts', 'goods_receipt_lines',
    'vendor_invoices', 'vendor_invoice_lines', 'vendor_payments',
    'stock_movements', 'journal_entries', 'journal_lines',
    'document_journal_links', 'document_sequences', 'learning_tasks',
    'learning_progress', 'import_batches'
  )
  and not c.relrowsecurity;

-- Expect: 0 rows (helpers DEFINER + search_path)
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_org_member', 'org_member_role', 'has_org_role', 'can_write_org',
    'seed_organization_accounts', 'create_organization'
  )
  and (
    p.prosecdef is not true
    or not (coalesce(p.proconfig, array[]::text[]) && array['search_path=public'])
  );

-- Expect: 0 rows — no authenticated write policies on catalogs
select pol.polname, c.relname, pol.polcmd
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('account_templates', 'learning_tasks')
  and pol.polcmd in ('a', 'w', 'd');

-- Expect: 0 rows — dangerous bootstrap policy text must not exist
select pol.polname
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'organization_members'
  and (
    coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ilike '%not exists%'
    or coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ilike '%not exists%'
  );

-- ===========================================================================
-- 1) Fixture sketch (run as migrator / service role once)
-- ===========================================================================
-- Replace UUIDs with real auth.users ids created in the review project.
--
-- insert into auth.users (id, email) …  -- platform-specific
-- select public.create_organization('Org A', 'org-a');  -- as user_owner_a
-- … create org B as user_owner_b
-- insert teacher/student/viewer memberships as owner
-- insert customers/products in each org for cross-org FK tests

-- ===========================================================================
-- 2) Role scenarios (run with set request.jwt.claim.sub / role)
-- ===========================================================================
-- Supabase local pattern (illustrative):
--   select set_config('request.jwt.claim.sub', '<user_uuid>', true);
--   set local role authenticated;

-- 2a) anon: Expect 0 rows from business tables
-- set local role anon;
-- select count(*) from public.customers;  -- Expect: 0 or error

-- 2b) member of A cannot select customers of B
-- Expect: 0
-- select id from public.customers where organization_id = '<org_b>';

-- 2c) teacher cannot insert into sales_invoices
-- Expect: failure / 0 rows inserted
-- insert into public.sales_invoices (…) values (…);

-- 2d) teacher cannot insert organization_members with role owner
-- Expect: failure
-- insert into public.organization_members (organization_id, user_id, role)
-- values ('<org_a>', '<other_user>', 'owner');

-- 2e) teacher CAN insert student member
-- Expect: success
-- insert into public.organization_members (organization_id, user_id, role)
-- values ('<org_a>', '<student_user>', 'student');

-- 2f) outsider cannot create_organization membership on existing org via INSERT
-- Expect: failure (no bootstrap policy)
-- insert into public.organization_members (organization_id, user_id, role)
-- values ('<org_a>', auth.uid(), 'owner');

-- 2g) outsider calling seed_organization_accounts(org_a) → exception owner required

-- 2h) cross-org FK: invoice org A + customer_id from org B → FK violation

-- 2i) booked invoice line update → exception / 0 rows
-- update public.sales_invoice_lines set quantity = quantity + 1
-- where invoice_id = '<booked_invoice>';

-- 2j) student peer learning_progress invisible
-- Expect: 0
-- select * from public.learning_progress
-- where user_id = '<other_student>' and organization_id = '<org_a>';

-- 2k) unbalanced journal_lines commit → exception (deferred constraint)

-- 2l) document_sequences update as student → no policy → failure

-- ===========================================================================
-- 3) EXECUTE privileges on sensitive functions
-- ===========================================================================
-- Expect: anon has no EXECUTE on create_organization / seed / booking stubs
select p.proname, r.rolname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl on true
join pg_roles r on r.oid = acl.grantee
where n.nspname = 'public'
  and p.proname in (
    'create_organization',
    'seed_organization_accounts',
    'book_sales_invoice',
    'handle_new_user'
  )
  and r.rolname in ('anon', 'public')
  and acl.privilege_type = 'EXECUTE';
