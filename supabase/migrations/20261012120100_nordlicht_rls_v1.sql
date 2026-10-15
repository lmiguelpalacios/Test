-- Nordlicht — RLS helpers + policies v1 (lokal im Repo)
-- Security-definer helpers vermeiden rekursive Policies auf organization_members.
-- Auto-RLS beim Projekt-Anlegen ersetzt NICHT — diese Datei ist die Quelle der Wahrheit.
-- Gehärtet 2026-10-12 (A1–A5 + Teacher Least Privilege). Nie remote angewendet — in-place.

-- ---------------------------------------------------------------------------
-- Helper functions (STABLE, SECURITY DEFINER, fixed search_path)
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
  );
$$;

create or replace function public.org_member_role(p_org_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_org_id
    and m.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.has_org_role(p_org_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = p_org_id
      and m.user_id = auth.uid()
      and m.role = any (p_roles)
  );
$$;

-- Writers for Übungsdaten: owner + student only (teacher = least privilege — Phase 2)
create or replace function public.can_write_org(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_org_role(p_org_id, array['owner', 'student']::text[]);
$$;

revoke all on function public.is_org_member(uuid) from public;
revoke all on function public.org_member_role(uuid) from public;
revoke all on function public.has_org_role(uuid, text[]) from public;
revoke all on function public.can_write_org(uuid) from public;
revoke all on function public.is_org_member(uuid) from anon;
revoke all on function public.org_member_role(uuid) from anon;
revoke all on function public.has_org_role(uuid, text[]) from anon;
revoke all on function public.can_write_org(uuid) from anon;
grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.org_member_role(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, text[]) to authenticated;
grant execute on function public.can_write_org(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS (+ FORCE so table owners cannot accidentally bypass in app roles)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.account_templates enable row level security;
alter table public.accounts enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.sales_invoices enable row level security;
alter table public.sales_invoice_lines enable row level security;
alter table public.sales_payments enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.goods_receipts enable row level security;
alter table public.goods_receipt_lines enable row level security;
alter table public.vendor_invoices enable row level security;
alter table public.vendor_invoice_lines enable row level security;
alter table public.vendor_payments enable row level security;
alter table public.stock_movements enable row level security;
alter table public.journal_entries enable row level security;
alter table public.journal_lines enable row level security;
alter table public.document_journal_links enable row level security;
alter table public.document_sequences enable row level security;
alter table public.learning_tasks enable row level security;
alter table public.learning_progress enable row level security;
alter table public.import_batches enable row level security;

-- FORCE on business data. Not on organizations / organization_members so
-- create_organization() (SECURITY DEFINER, same owner as tables) can insert
-- the first owner row even when the role lacks BYPASSRLS (non-Supabase local PG).
alter table public.profiles force row level security;
alter table public.accounts force row level security;
alter table public.customers force row level security;
alter table public.suppliers force row level security;
alter table public.products force row level security;
alter table public.sales_invoices force row level security;
alter table public.sales_invoice_lines force row level security;
alter table public.sales_payments force row level security;
alter table public.purchase_orders force row level security;
alter table public.purchase_order_lines force row level security;
alter table public.goods_receipts force row level security;
alter table public.goods_receipt_lines force row level security;
alter table public.vendor_invoices force row level security;
alter table public.vendor_invoice_lines force row level security;
alter table public.vendor_payments force row level security;
alter table public.stock_movements force row level security;
alter table public.journal_entries force row level security;
alter table public.journal_lines force row level security;
alter table public.document_journal_links force row level security;
alter table public.document_sequences force row level security;
alter table public.learning_progress force row level security;
alter table public.import_batches force row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_own
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations
-- No direct INSERT for authenticated — use create_organization() (A1).
-- ---------------------------------------------------------------------------
create policy organizations_select_member
  on public.organizations for select to authenticated
  using (public.is_org_member(id));

create policy organizations_update_owner
  on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner']::text[]))
  with check (public.has_org_role(id, array['owner']::text[]));

-- ---------------------------------------------------------------------------
-- organization_members (A1 bootstrap removed; A5 teacher cannot grant owner)
-- ---------------------------------------------------------------------------
create policy organization_members_select
  on public.organization_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_org_member(organization_id)
  );

create policy organization_members_insert_owner
  on public.organization_members for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner']::text[]));

-- Teacher: member-admin for student/viewer only — not owner/teacher, not self-escalation
create policy organization_members_insert_teacher
  on public.organization_members for insert to authenticated
  with check (
    public.has_org_role(organization_id, array['teacher']::text[])
    and role in ('student', 'viewer')
  );

create policy organization_members_update_owner
  on public.organization_members for update to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]))
  with check (public.has_org_role(organization_id, array['owner']::text[]));

create policy organization_members_delete_owner
  on public.organization_members for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

-- ---------------------------------------------------------------------------
-- Global read catalogs
-- ---------------------------------------------------------------------------
create policy account_templates_select_authenticated
  on public.account_templates for select to authenticated
  using (true);

create policy learning_tasks_select_authenticated
  on public.learning_tasks for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Org business tables: SELECT members; write can_write_org (owner|student)
-- Deletes of Stammdaten / kritische Belege: owner only
-- ---------------------------------------------------------------------------

create policy accounts_select on public.accounts for select to authenticated
  using (public.is_org_member(organization_id));
create policy accounts_insert on public.accounts for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy accounts_update on public.accounts for update to authenticated
  using (public.can_write_org(organization_id))
  with check (public.can_write_org(organization_id));
create policy accounts_delete on public.accounts for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy customers_select on public.customers for select to authenticated
  using (public.is_org_member(organization_id));
create policy customers_insert on public.customers for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy customers_update on public.customers for update to authenticated
  using (public.can_write_org(organization_id))
  with check (public.can_write_org(organization_id));
create policy customers_delete on public.customers for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy suppliers_select on public.suppliers for select to authenticated
  using (public.is_org_member(organization_id));
create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy suppliers_update on public.suppliers for update to authenticated
  using (public.can_write_org(organization_id))
  with check (public.can_write_org(organization_id));
create policy suppliers_delete on public.suppliers for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy products_select on public.products for select to authenticated
  using (public.is_org_member(organization_id));
create policy products_insert on public.products for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy products_update on public.products for update to authenticated
  using (public.can_write_org(organization_id))
  with check (public.can_write_org(organization_id));
create policy products_delete on public.products for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

-- sales_invoices: drafts only via client; booked_at stays null on UPDATE (RPC books)
create policy sales_invoices_select on public.sales_invoices for select to authenticated
  using (public.is_org_member(organization_id));
create policy sales_invoices_insert on public.sales_invoices for insert to authenticated
  with check (public.can_write_org(organization_id) and booked_at is null);
create policy sales_invoices_update on public.sales_invoices for update to authenticated
  using (public.can_write_org(organization_id) and booked_at is null)
  with check (public.can_write_org(organization_id) and booked_at is null);
create policy sales_invoices_delete on public.sales_invoices for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]) and booked_at is null);

-- A4: lines only while parent unbooked
create policy sales_invoice_lines_select on public.sales_invoice_lines for select to authenticated
  using (public.is_org_member(organization_id));
create policy sales_invoice_lines_insert on public.sales_invoice_lines for insert to authenticated
  with check (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.sales_invoices i
      where i.id = invoice_id
        and i.organization_id = sales_invoice_lines.organization_id
        and i.booked_at is null
    )
  );
create policy sales_invoice_lines_update on public.sales_invoice_lines for update to authenticated
  using (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.sales_invoices i
      where i.id = invoice_id
        and i.organization_id = sales_invoice_lines.organization_id
        and i.booked_at is null
    )
  )
  with check (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.sales_invoices i
      where i.id = invoice_id
        and i.organization_id = sales_invoice_lines.organization_id
        and i.booked_at is null
    )
  );
create policy sales_invoice_lines_delete on public.sales_invoice_lines for delete to authenticated
  using (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.sales_invoices i
      where i.id = invoice_id
        and i.organization_id = sales_invoice_lines.organization_id
        and i.booked_at is null
    )
  );

create policy sales_payments_select on public.sales_payments for select to authenticated
  using (public.is_org_member(organization_id));
create policy sales_payments_insert on public.sales_payments for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy sales_payments_delete on public.sales_payments for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy purchase_orders_select on public.purchase_orders for select to authenticated
  using (public.is_org_member(organization_id));
create policy purchase_orders_insert on public.purchase_orders for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy purchase_orders_update on public.purchase_orders for update to authenticated
  using (public.can_write_org(organization_id))
  with check (public.can_write_org(organization_id));
create policy purchase_orders_delete on public.purchase_orders for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]) and confirmed_at is null);

create policy purchase_order_lines_select on public.purchase_order_lines for select to authenticated
  using (public.is_org_member(organization_id));
create policy purchase_order_lines_insert on public.purchase_order_lines for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy purchase_order_lines_update on public.purchase_order_lines for update to authenticated
  using (public.can_write_org(organization_id))
  with check (public.can_write_org(organization_id));
create policy purchase_order_lines_delete on public.purchase_order_lines for delete to authenticated
  using (public.can_write_org(organization_id));

create policy goods_receipts_select on public.goods_receipts for select to authenticated
  using (public.is_org_member(organization_id));
create policy goods_receipts_insert on public.goods_receipts for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy goods_receipts_delete on public.goods_receipts for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy goods_receipt_lines_select on public.goods_receipt_lines for select to authenticated
  using (public.is_org_member(organization_id));
create policy goods_receipt_lines_insert on public.goods_receipt_lines for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy goods_receipt_lines_delete on public.goods_receipt_lines for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy vendor_invoices_select on public.vendor_invoices for select to authenticated
  using (public.is_org_member(organization_id));
create policy vendor_invoices_insert on public.vendor_invoices for insert to authenticated
  with check (public.can_write_org(organization_id) and booked_at is null);
create policy vendor_invoices_update on public.vendor_invoices for update to authenticated
  using (public.can_write_org(organization_id) and booked_at is null)
  with check (public.can_write_org(organization_id) and booked_at is null);
create policy vendor_invoices_delete on public.vendor_invoices for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]) and booked_at is null);

create policy vendor_invoice_lines_select on public.vendor_invoice_lines for select to authenticated
  using (public.is_org_member(organization_id));
create policy vendor_invoice_lines_insert on public.vendor_invoice_lines for insert to authenticated
  with check (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.vendor_invoices i
      where i.id = invoice_id
        and i.organization_id = vendor_invoice_lines.organization_id
        and i.booked_at is null
    )
  );
create policy vendor_invoice_lines_update on public.vendor_invoice_lines for update to authenticated
  using (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.vendor_invoices i
      where i.id = invoice_id
        and i.organization_id = vendor_invoice_lines.organization_id
        and i.booked_at is null
    )
  )
  with check (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.vendor_invoices i
      where i.id = invoice_id
        and i.organization_id = vendor_invoice_lines.organization_id
        and i.booked_at is null
    )
  );
create policy vendor_invoice_lines_delete on public.vendor_invoice_lines for delete to authenticated
  using (
    public.can_write_org(organization_id)
    and exists (
      select 1 from public.vendor_invoices i
      where i.id = invoice_id
        and i.organization_id = vendor_invoice_lines.organization_id
        and i.booked_at is null
    )
  );

create policy vendor_payments_select on public.vendor_payments for select to authenticated
  using (public.is_org_member(organization_id));
create policy vendor_payments_insert on public.vendor_payments for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy vendor_payments_delete on public.vendor_payments for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy stock_movements_select on public.stock_movements for select to authenticated
  using (public.is_org_member(organization_id));
create policy stock_movements_insert on public.stock_movements for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy stock_movements_delete on public.stock_movements for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy journal_entries_select on public.journal_entries for select to authenticated
  using (public.is_org_member(organization_id));
create policy journal_entries_insert on public.journal_entries for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy journal_entries_delete on public.journal_entries for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy journal_lines_select on public.journal_lines for select to authenticated
  using (public.is_org_member(organization_id));
create policy journal_lines_insert on public.journal_lines for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy journal_lines_delete on public.journal_lines for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

create policy document_journal_links_select on public.document_journal_links for select to authenticated
  using (public.is_org_member(organization_id));
create policy document_journal_links_insert on public.document_journal_links for insert to authenticated
  with check (public.can_write_org(organization_id));
create policy document_journal_links_delete on public.document_journal_links for delete to authenticated
  using (public.has_org_role(organization_id, array['owner']::text[]));

-- Sequences: read members; no direct client UPDATE (next_document_number RPC later)
create policy document_sequences_select on public.document_sequences for select to authenticated
  using (public.is_org_member(organization_id));

-- learning_progress
create policy learning_progress_select on public.learning_progress for select to authenticated
  using (
    user_id = auth.uid()
    or public.has_org_role(organization_id, array['owner', 'teacher']::text[])
  );
create policy learning_progress_insert on public.learning_progress for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_org_member(organization_id)
  );
create policy learning_progress_update on public.learning_progress for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_org_member(organization_id));

-- import: owner only (teacher is not bookkeeping admin)
create policy import_batches_select on public.import_batches for select to authenticated
  using (public.is_org_member(organization_id));
create policy import_batches_insert on public.import_batches for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner']::text[]));
