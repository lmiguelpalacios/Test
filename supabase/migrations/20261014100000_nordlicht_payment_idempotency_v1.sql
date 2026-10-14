-- Nordlicht — Payment idempotency hardening (local / review apply later)
-- Adds unique expression indexes matching the existing RPC natural-key lookup:
--   (organization_id, invoice_id, payment_date, amount_cents, bank_account, coalesce(reference,''))
--
-- Does NOT rewrite schema_v1 / rls_v1 / grants_v1 / booking_rpcs_v1.
-- Does NOT invent an opaque idempotency_key: the natural key is fachlich sufficient
-- for retry detection while allowing legitimate Teilzahlungen that differ by
-- amount, payment_date, bank_account, or reference (Verwendungszweck).
--
-- RPC bodies unchanged: coalesce(nullif) insert path already matches this index.
-- Belt-and-suspenders with invoice-row FOR UPDATE in record_*_payment.

-- ---------------------------------------------------------------------------
-- sales_payments
-- ---------------------------------------------------------------------------
create unique index if not exists sales_payments_natural_key_uidx
  on public.sales_payments (
    organization_id,
    invoice_id,
    payment_date,
    amount_cents,
    bank_account,
    (coalesce(reference, ''))
  );

comment on index public.sales_payments_natural_key_uidx is
  'Idempotent ZE natural key; coalesce(reference,'''') matches record_sales_payment lookup. Teilzahlungen with distinct amount/date/bank/ref remain allowed.';

-- ---------------------------------------------------------------------------
-- vendor_payments
-- ---------------------------------------------------------------------------
create unique index if not exists vendor_payments_natural_key_uidx
  on public.vendor_payments (
    organization_id,
    invoice_id,
    payment_date,
    amount_cents,
    bank_account,
    (coalesce(reference, ''))
  );

comment on index public.vendor_payments_natural_key_uidx is
  'Idempotent ZA natural key; coalesce(reference,'''') matches record_vendor_payment lookup. Teilzahlungen with distinct amount/date/bank/ref remain allowed.';
