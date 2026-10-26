-- Nordlicht — Phase 1 least-privilege GRANTs (v1)
-- Apply after schema + RLS migrations. Not a remote deploy step by itself.
-- Journal/payment/stock direct writes remain for authenticated until
-- 20261013140100_nordlicht_booking_rpcs_v1.sql revokes them (plan choice).

-- ---------------------------------------------------------------------------
-- anon: no table/sequence privileges on public business objects
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

-- Future objects created by migrator: do not auto-grant to anon
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- ---------------------------------------------------------------------------
-- authenticated: start from zero, then grant least privilege
-- (Bootstrap / platform defaults may have granted broad DML.)
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from authenticated;
revoke all on all sequences in schema public from authenticated;

-- Readable RLS tables (SELECT for members / catalogs / own profile)
grant select on table
  public.profiles,
  public.organizations,
  public.organization_members,
  public.account_templates,
  public.accounts,
  public.customers,
  public.suppliers,
  public.products,
  public.sales_invoices,
  public.sales_invoice_lines,
  public.sales_payments,
  public.purchase_orders,
  public.purchase_order_lines,
  public.goods_receipts,
  public.goods_receipt_lines,
  public.vendor_invoices,
  public.vendor_invoice_lines,
  public.vendor_payments,
  public.stock_movements,
  public.journal_entries,
  public.journal_lines,
  public.document_journal_links,
  public.document_sequences,
  public.learning_tasks,
  public.learning_progress,
  public.import_batches
to authenticated;

-- profiles: own-row UPDATE only (RLS); no INSERT (trigger handle_new_user)
grant update on table public.profiles to authenticated;

-- organizations: no INSERT (create_organization RPC); owner UPDATE via RLS
grant update on table public.organizations to authenticated;

-- organization_members: owner/teacher admin paths via RLS
grant insert, update, delete on table public.organization_members to authenticated;

-- Stammdaten / drafts (RLS further restricts)
grant insert, update, delete on table
  public.accounts,
  public.customers,
  public.suppliers,
  public.products,
  public.sales_invoices,
  public.sales_invoice_lines,
  public.purchase_orders,
  public.purchase_order_lines,
  public.goods_receipts,
  public.goods_receipt_lines,
  public.vendor_invoices,
  public.vendor_invoice_lines
to authenticated;

-- learning_progress: self insert/update
grant insert, update on table public.learning_progress to authenticated;

-- import_batches: owner insert (RLS)
grant insert on table public.import_batches to authenticated;

-- Phase 1: keep journal / payment / stock / link client writes until RPC migration
grant insert, delete on table
  public.journal_entries,
  public.journal_lines,
  public.document_journal_links,
  public.sales_payments,
  public.vendor_payments,
  public.stock_movements
to authenticated;

-- document_sequences: SELECT only (no client UPDATE/INSERT/DELETE)
-- (explicit: no DML grant)

-- Sequences (if any identity/serial appear later)
grant usage, select on all sequences in schema public to authenticated;

-- Tighten default privileges for future tables created by this role
alter default privileges in schema public
  revoke insert, update, delete on tables from authenticated;

-- ---------------------------------------------------------------------------
-- Functions: anon must not EXECUTE business helpers (incl. gross helpers)
-- Existing migration grants for authenticated are preserved; re-assert revokes.
-- ---------------------------------------------------------------------------
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.assert_journal_entry_balanced() from public, anon, authenticated;
revoke all on function public.enforce_invoice_booking_immutability() from public, anon, authenticated;
revoke all on function public.enforce_sales_invoice_lines_unlocked() from public, anon, authenticated;
revoke all on function public.enforce_vendor_invoice_lines_unlocked() from public, anon, authenticated;
revoke all on function public.enforce_sales_payment_rules() from public, anon, authenticated;
revoke all on function public.enforce_vendor_payment_rules() from public, anon, authenticated;

revoke all on function public.sales_invoice_gross_cents(uuid, uuid) from public, anon;
revoke all on function public.vendor_invoice_gross_cents(uuid, uuid) from public, anon;
grant execute on function public.sales_invoice_gross_cents(uuid, uuid) to authenticated;
grant execute on function public.vendor_invoice_gross_cents(uuid, uuid) to authenticated;

revoke all on function public.is_org_member(uuid) from public, anon;
revoke all on function public.org_member_role(uuid) from public, anon;
revoke all on function public.has_org_role(uuid, text[]) from public, anon;
revoke all on function public.can_write_org(uuid) from public, anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_member_role(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.can_write_org(uuid) to authenticated;

revoke all on function public.seed_organization_accounts(uuid) from public, anon;
revoke all on function public.create_organization(text, text) from public, anon;
grant execute on function public.seed_organization_accounts(uuid) to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;

comment on schema public is
  'Nordlicht public schema. Phase1 grants: anon has no table DML/SELECT; authenticated least-privilege; journal/payment writes revoked in booking RPC migration.';
