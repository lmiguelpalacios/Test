-- Nordlicht — RPC stubs for critical booking paths (NOT a migration)
-- Intentionally incomplete bodies: authz + raise until implemented later.
-- Do NOT apply via apply_migration / execute_sql in the remediation step.
-- Target later: nordlicht-handels only (never TrueFuel).
--
-- Secure contract (Phase 2 documentation — implement in a future migration):
-- * SECURITY DEFINER + set search_path = public
-- * First lines: auth.uid() not null; can_write_org / role checks; org matches row
-- * Row locks (SELECT … FOR UPDATE) on invoice/order before mutate
-- * Single transaction: journal + lines + links + stock + booked_at / flags
-- * revoke all from public/anon; grant execute to authenticated only
-- * Clients must NOT set booked_at / sequences / practice_posted_at via direct SQL

-- ---------------------------------------------------------------------------
-- next_document_number — atomic sequence allocation (owner|student)
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: next_document_number not implemented. Allocate via document_sequences FOR UPDATE.';
end;
$$;

comment on function public.next_document_number(uuid, text) is
  'STUB+authz. Later: lock document_sequences row, increment, return previous next_value.';

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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: book_sales_invoice not implemented. FOR UPDATE invoice; booked_at is null; journal+links+stock; set booked_at.';
end;
$$;

comment on function public.book_sales_invoice(uuid, uuid) is
  'STUB+authz. Later: only path that sets sales_invoices.booked_at.';

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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: book_vendor_invoice not implemented.';
end;
$$;

comment on function public.book_vendor_invoice(uuid, uuid) is
  'STUB+authz. Later: only path that sets vendor_invoices.booked_at.';

-- ---------------------------------------------------------------------------
-- record_sales_payment
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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: record_sales_payment not implemented. Trigger also rejects overpay / unbooked.';
end;
$$;

comment on function public.record_sales_payment(uuid, uuid, date, int, text, text) is
  'STUB+authz. Prefer this over direct insert when journal link required.';

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
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.can_write_org(p_organization_id) then
    raise exception 'forbidden';
  end if;
  raise exception
    'STUB: record_vendor_payment not implemented.';
end;
$$;

comment on function public.record_vendor_payment(uuid, uuid, date, int, text, text) is
  'STUB+authz.';

-- ---------------------------------------------------------------------------
-- record_goods_receipt
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
-- post_learning_practice
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
-- import_workspace — owner only
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

revoke all on function public.next_document_number(uuid, text) from public;
revoke all on function public.book_sales_invoice(uuid, uuid) from public;
revoke all on function public.book_vendor_invoice(uuid, uuid) from public;
revoke all on function public.record_sales_payment(uuid, uuid, date, int, text, text) from public;
revoke all on function public.record_vendor_payment(uuid, uuid, date, int, text, text) from public;
revoke all on function public.record_goods_receipt(uuid, uuid, date, jsonb) from public;
revoke all on function public.post_learning_practice(uuid, text) from public;
revoke all on function public.import_workspace(uuid, text, jsonb, text) from public;

revoke all on function public.next_document_number(uuid, text) from anon;
revoke all on function public.book_sales_invoice(uuid, uuid) from anon;
revoke all on function public.book_vendor_invoice(uuid, uuid) from anon;
revoke all on function public.record_sales_payment(uuid, uuid, date, int, text, text) from anon;
revoke all on function public.record_vendor_payment(uuid, uuid, date, int, text, text) from anon;
revoke all on function public.record_goods_receipt(uuid, uuid, date, jsonb) from anon;
revoke all on function public.post_learning_practice(uuid, text) from anon;
revoke all on function public.import_workspace(uuid, text, jsonb, text) from anon;

grant execute on function public.next_document_number(uuid, text) to authenticated;
grant execute on function public.book_sales_invoice(uuid, uuid) to authenticated;
grant execute on function public.book_vendor_invoice(uuid, uuid) to authenticated;
grant execute on function public.record_sales_payment(uuid, uuid, date, int, text, text) to authenticated;
grant execute on function public.record_vendor_payment(uuid, uuid, date, int, text, text) to authenticated;
grant execute on function public.record_goods_receipt(uuid, uuid, date, jsonb) to authenticated;
grant execute on function public.post_learning_practice(uuid, text) to authenticated;
grant execute on function public.import_workspace(uuid, text, jsonb, text) to authenticated;
