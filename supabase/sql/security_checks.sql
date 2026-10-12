-- Nordlicht — manual / CI security checks (NOT a migration)
-- Run against a review environment AFTER migrations are applied.
-- Never run against TrueFuel. Never contains secrets.
-- Expected: queries return zero rows where noted, or boolean true.

-- ---------------------------------------------------------------------------
-- 1) Every public business table must have RLS enabled
-- ---------------------------------------------------------------------------
-- Expect: 0 rows
select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'organizations',
    'organization_members',
    'account_templates',
    'accounts',
    'customers',
    'suppliers',
    'products',
    'sales_invoices',
    'sales_invoice_lines',
    'sales_payments',
    'purchase_orders',
    'purchase_order_lines',
    'goods_receipts',
    'goods_receipt_lines',
    'vendor_invoices',
    'vendor_invoice_lines',
    'vendor_payments',
    'stock_movements',
    'journal_entries',
    'journal_lines',
    'document_journal_links',
    'document_sequences',
    'learning_tasks',
    'learning_progress',
    'import_batches'
  )
  and not c.relrowsecurity;

-- ---------------------------------------------------------------------------
-- 2) No FORCE RLS missing on critical tables (optional hardening)
-- ---------------------------------------------------------------------------
-- Informational: list tables with RLS but without FORCE
select c.relname as rls_without_force
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relrowsecurity
  and not c.relforcerowsecurity
order by 1;

-- ---------------------------------------------------------------------------
-- 3) Helper functions must be SECURITY DEFINER with fixed search_path
-- ---------------------------------------------------------------------------
-- Expect: 0 rows (all helpers definer + search_path contains public)
select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'is_org_member',
    'org_member_role',
    'has_org_role',
    'can_write_org'
  )
  and (
    p.prosecdef is not true
    or coalesce(p.proconfig, array[]::text[]) not && array['search_path=public']
  );

-- ---------------------------------------------------------------------------
-- 4) authenticated must NOT have write policies on global catalogs
-- ---------------------------------------------------------------------------
-- Expect: 0 rows for INSERT/UPDATE/DELETE on account_templates / learning_tasks
select pol.polname, c.relname, pol.polcmd
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('account_templates', 'learning_tasks')
  and pol.polcmd in ('a', 'w', 'd'); -- insert / update / delete

-- ---------------------------------------------------------------------------
-- 5) Cross-org isolation smoke (requires seeded fixtures — placeholder)
-- ---------------------------------------------------------------------------
-- After seeding org A + org B with distinct members:
--   set local role authenticated; set request.jwt.claim.sub = '<user_a>';
--   select count(*) from customers;  -- only org A
-- Document expected counts in review notes; do not hardcode UUIDs here.

-- ---------------------------------------------------------------------------
-- 6) Booked invoices must not be updatable via policy path
-- ---------------------------------------------------------------------------
-- Policy sales_invoices_update / vendor_invoices_update require booked_at is null.
-- Manual: as writer, update … set due_date = … where booked_at is not null → 0 rows.

-- ---------------------------------------------------------------------------
-- 7) learning_progress: student cannot read peer rows
-- ---------------------------------------------------------------------------
-- Manual: as student B, select from learning_progress where user_id = student_a → 0 rows.
-- Teacher/owner in same org may select all org progress.

-- ---------------------------------------------------------------------------
-- 8) Stub RPCs must exist and raise (after optional apply of rpc_booking_stubs.sql)
-- ---------------------------------------------------------------------------
-- select public.book_sales_invoice(gen_random_uuid(), gen_random_uuid());
-- Expected: exception containing 'STUB'
