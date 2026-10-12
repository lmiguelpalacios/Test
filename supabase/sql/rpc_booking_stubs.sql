-- Nordlicht — RPC stubs for critical booking paths (NOT a migration)
-- Intentionally incomplete: raise until implemented in a later migration.
-- Do NOT apply via apply_migration / execute_sql in this step.
-- Target later: nordlicht-handels only (never TrueFuel).

-- ---------------------------------------------------------------------------
-- next_document_number — atomic sequence allocation
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
  raise exception
    'STUB: next_document_number not implemented. Allocate via document_sequences in a later migration.';
end;
$$;

comment on function public.next_document_number(uuid, text) is
  'STUB. Later: select … for update on document_sequences, increment, return next_value.';

-- ---------------------------------------------------------------------------
-- book_sales_invoice — lock draft, post journal, stock, set booked_at
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
  raise exception
    'STUB: book_sales_invoice not implemented. Replaces client bookingLocks + bookInvoice.';
end;
$$;

comment on function public.book_sales_invoice(uuid, uuid) is
  'STUB. Later: FOR UPDATE invoice where booked_at is null; validate lines; insert journal + links + stock; set booked_at.';

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
  raise exception
    'STUB: book_vendor_invoice not implemented. Replaces client bookVendorInvoice.';
end;
$$;

comment on function public.book_vendor_invoice(uuid, uuid) is
  'STUB. Later: FOR UPDATE vendor invoice; journal + links; set booked_at once.';

-- ---------------------------------------------------------------------------
-- record_sales_payment — reject overpayment
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
  raise exception
    'STUB: record_sales_payment not implemented. Must reject amount > open balance.';
end;
$$;

comment on function public.record_sales_payment(uuid, uuid, date, int, text, text) is
  'STUB. Later: sum existing payments vs gross; insert payment + journal; link.';

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
  raise exception
    'STUB: record_vendor_payment not implemented. Must reject amount > open balance.';
end;
$$;

comment on function public.record_vendor_payment(uuid, uuid, date, int, text, text) is
  'STUB. Later: same pattern as record_sales_payment for AP.';

-- ---------------------------------------------------------------------------
-- record_goods_receipt — aggregated remaining qty, no over-delivery
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
  raise exception
    'STUB: record_goods_receipt not implemented. Must enforce aggregated remaining quantity.';
end;
$$;

comment on function public.record_goods_receipt(uuid, uuid, date, jsonb) is
  'STUB. Later: aggregate prior WE lines per order_line; reject qty > remaining; stock_movements.';

-- ---------------------------------------------------------------------------
-- post_learning_practice — only when completed and not yet posted
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
  raise exception
    'STUB: post_learning_practice not implemented. Requires completed + practice_posted_at is null.';
end;
$$;

comment on function public.post_learning_practice(uuid, text) is
  'STUB. Later: auth.uid() progress row; insert LERN-* journal once; set practice_posted_at.';

-- ---------------------------------------------------------------------------
-- import_workspace — idempotent v4 import (hash / batch)
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
  raise exception
    'STUB: import_workspace not implemented. Explicit wizard only; never silent localStorage upload.';
end;
$$;

comment on function public.import_workspace(uuid, text, jsonb, text) is
  'STUB. Later: insert import_batches unique (org, hash); remap legacy_id; learning_progress for auth.uid() only.';

-- Grants: authenticated may call stubs (they only raise). Revoke from anon.
revoke all on function public.next_document_number(uuid, text) from public;
revoke all on function public.book_sales_invoice(uuid, uuid) from public;
revoke all on function public.book_vendor_invoice(uuid, uuid) from public;
revoke all on function public.record_sales_payment(uuid, uuid, date, int, text, text) from public;
revoke all on function public.record_vendor_payment(uuid, uuid, date, int, text, text) from public;
revoke all on function public.record_goods_receipt(uuid, uuid, date, jsonb) from public;
revoke all on function public.post_learning_practice(uuid, text) from public;
revoke all on function public.import_workspace(uuid, text, jsonb, text) from public;

grant execute on function public.next_document_number(uuid, text) to authenticated;
grant execute on function public.book_sales_invoice(uuid, uuid) to authenticated;
grant execute on function public.book_vendor_invoice(uuid, uuid) to authenticated;
grant execute on function public.record_sales_payment(uuid, uuid, date, int, text, text) to authenticated;
grant execute on function public.record_vendor_payment(uuid, uuid, date, int, text, text) to authenticated;
grant execute on function public.record_goods_receipt(uuid, uuid, date, jsonb) to authenticated;
grant execute on function public.post_learning_practice(uuid, text) to authenticated;
grant execute on function public.import_workspace(uuid, text, jsonb, text) to authenticated;
