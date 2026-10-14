-- Nordlicht — remaining RPC stubs (NOT a migration for the five core booking RPCs)
--
-- SUPERSEDED for core booking by migration:
--   supabase/migrations/20261013140100_nordlicht_booking_rpcs_v1.sql
--   (next_document_number, book_sales_invoice, book_vendor_invoice,
--    record_sales_payment, record_vendor_payment)
--
-- Remaining stubs in this file:
--   post_learning_practice  (still stub)
--
-- SUPERSEDED by migration 20261014120000_nordlicht_app_rpcs_v1.sql:
--   record_goods_receipt, import_workspace
--
-- Do NOT apply the five core stubs here — the local harness applies the
-- booking migration instead. Do NOT apply via apply_migration / execute_sql
-- against remote projects in this phase.
--
-- Secure contract (shared):
-- * SECURITY DEFINER + set search_path = public
-- * First lines: auth.uid() not null; can_write_org / role checks; org matches row
-- * Row locks (SELECT … FOR UPDATE) on invoice/order before mutate
-- * Single transaction: journal + lines + links + stock + booked_at / flags
-- * revoke all from public/anon; grant execute to authenticated only
-- * Clients must NOT set booked_at / sequences / practice_posted_at via direct SQL

-- ---------------------------------------------------------------------------
-- record_goods_receipt (still STUB)
-- ---------------------------------------------------------------------------
create or replace function public.record_goods_receipt(
  p_organization_id uuid,
  p_order_id uuid,
  p_receipt_date date,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: record_goods_receipt not implemented. Enforce aggregated remaining qty.';
end;
$$;

comment on function public.record_goods_receipt(uuid, uuid, date, jsonb) is
  'STUB+authz. Negative stock policy: allowed (matches client) until product decision.';

-- ---------------------------------------------------------------------------
-- post_learning_practice (still STUB)
-- ---------------------------------------------------------------------------
create or replace function public.post_learning_practice(
  p_organization_id uuid,
  p_task_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_org_member(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: post_learning_practice not implemented. Requires completed + practice_posted_at is null for auth.uid().';
end;
$$;

comment on function public.post_learning_practice(uuid, text) is
  'STUB+authz. Member (incl. student); not teacher-writing-for-student.';

-- ---------------------------------------------------------------------------
-- import_workspace — owner only (still STUB)
-- ---------------------------------------------------------------------------
create or replace function public.import_workspace(
  p_organization_id uuid,
  p_content_hash text,
  p_payload jsonb,
  p_source_label text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.has_org_role(p_organization_id, array['owner']::text[]) then
    raise exception 'forbidden: owner required';
  end if;
  raise exception
    'STUB: import_workspace not implemented. Explicit wizard only; never silent localStorage upload.';
end;
$$;

comment on function public.import_workspace(uuid, text, jsonb, text) is
  'STUB+authz. Owner only; idempotent on (organization_id, content_hash).';

revoke all on function public.record_goods_receipt(uuid, uuid, date, jsonb) from public;
revoke all on function public.post_learning_practice(uuid, text) from public;
revoke all on function public.import_workspace(uuid, text, jsonb, text) from public;

revoke all on function public.record_goods_receipt(uuid, uuid, date, jsonb) from anon;
revoke all on function public.post_learning_practice(uuid, text) from anon;
revoke all on function public.import_workspace(uuid, text, jsonb, text) from anon;

grant execute on function public.record_goods_receipt(uuid, uuid, date, jsonb) to authenticated;
grant execute on function public.post_learning_practice(uuid, text) to authenticated;
grant execute on function public.import_workspace(uuid, text, jsonb, text) to authenticated;
