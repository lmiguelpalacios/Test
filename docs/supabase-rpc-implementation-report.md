# Supabase RPC Implementation Report — Phase 1–3 (local only)

**Stand:** 2026-10-14  
**Branch:** `cursor/supabase-rpc-hardening-2188` (from `cursor/uebungsunternehmen-frontend-6a56`)  
**Remote SQL / Deploy:** **nicht ausgeführt** — kein `apply_migration` / `execute_sql` gegen irgendein Supabase-Projekt.  
**Unberührt:** `nordlicht-security-review` (`tbxdoapspjhabcsxgllx`), `nordlicht-handels` (`kicwytgtrdadrhhlfrnn`), TrueFuel (`ipblsxncnwyizdxudtrc`).  
**App:** React / localStorage unverändert.

---

## Migrations

| Datei | Phase | Inhalt |
|-------|-------|--------|
| `supabase/migrations/20261012120000_nordlicht_schema_v1.sql` | (bestehend) | **unverändert** |
| `supabase/migrations/20261012120100_nordlicht_rls_v1.sql` | (bestehend) | **unverändert** |
| `supabase/migrations/20261013140000_nordlicht_grants_v1.sql` | 1 | Least-privilege GRANTs; anon revoke; authenticated SELECT + draft/master DML; journal/payment writes **noch erlaubt** |
| `supabase/migrations/20261013140100_nordlicht_booking_rpcs_v1.sql` | 2 | Echte Bodies für 5 Kern-RPCs; Drop partial one-booking index; Revoke direct writes auf Journal/Payments/Stock/Links |

Supporting (keine Migrationen):

- `supabase/sql/rpc_booking_stubs.sql` — nur noch Stubs für `record_goods_receipt`, `post_learning_practice`, `import_workspace` (Header: fünf Kern-RPCs supersedet)
- `supabase/sql/security_checks.sql` — erweitert um anon table/sequence privileges + EXECUTE-Liste + Phase-2 revoke checks
- `supabase/sql/local_review/run_local_review.sh` — `04_grants` = Grant-Migration; `05_booking_rpcs` = RPC-Migration; `05b` = Rest-Stubs; `08_booking_rpc_tests`
- `supabase/sql/local_review/20_booking_rpc_tests.sql` — neue Booking-Tests
- `supabase/sql/local_review/10_fixtures_and_negative_tests.sql` — anon ohne GRANT; Journal-Direct-Insert-Revoke; Balance-Trigger als Owner

---

## Grant matrix (nach Phase 1+2 apply)

### `anon`

| Objekt | Privileg |
|--------|----------|
| Alle `public`-Business-Tabellen | **kein** SELECT/INSERT/UPDATE/DELETE |
| Sequences in `public` | **kein** USAGE/SELECT |
| Business-/Helper-/Booking-/Trigger-Funktionen | **kein** EXECUTE (inkl. Gross-Helper) |

### `authenticated` — Tabellen

| Gruppe | SELECT | INSERT | UPDATE | DELETE |
|--------|--------|--------|--------|--------|
| profiles | ✓ | — | ✓ | — |
| organizations | ✓ | — (RPC) | ✓ | — |
| organization_members | ✓ | ✓ | ✓ | ✓ |
| account_templates, learning_tasks | ✓ | — | — | — |
| accounts, customers, suppliers, products | ✓ | ✓ | ✓ | ✓ |
| sales/vendor invoices + lines, orders, goods receipts | ✓ | ✓ | ✓* | ✓* |
| document_sequences | ✓ | — | — | — |
| learning_progress | ✓ | ✓ | ✓ | — |
| import_batches | ✓ | ✓ | — | — |
| journal_entries, journal_lines, document_journal_links | ✓ | **revoked Phase 2** | — | **revoked** |
| sales_payments, vendor_payments, stock_movements | ✓ | **revoked Phase 2** | — | **revoked** |

\*RLS weiter: booked invoices locked; deletes oft owner-only.

### Funktionen (EXECUTE)

| Funktion | authenticated | anon/public |
|----------|---------------|-------------|
| `is_org_member`, `org_member_role`, `has_org_role`, `can_write_org` | ✓ | ✗ |
| `create_organization`, `seed_organization_accounts` | ✓ | ✗ |
| `sales_invoice_gross_cents`, `vendor_invoice_gross_cents` | ✓ | ✗ |
| `next_document_number`, `book_*`, `record_*_payment` | ✓ | ✗ |
| Trigger enforcers / `handle_new_user` | ✗ | ✗ |
| `_nl_*` internal helpers | ✗ | ✗ |
| Remaining stubs (goods/learning/import) | ✓ | ✗ |

### Documented exceptions

1. **FORCE RLS off** on `organizations`, `organization_members`, `account_templates`, `learning_tasks` — needed for `create_organization` DEFINER bootstrap without BYPASSRLS (unchanged from RLS v1).
2. **Gross helper vs group tax:** payment overpay uses `*_invoice_gross_cents` (per-line); booking journal uses client group-net tax. Can diverge on fractional qty; noted in tests.
3. **Multi-VAT document numbers:** suffix `-U{rate}` (and expense account for ER) to satisfy `unique (org, document_number)`.
4. **Dropped** `document_journal_links_one_booking_idx` — multi-VAT needs multiple booking links; Doppelbuchung via `booked_at` + `FOR UPDATE` + `already_booked`.

---

## RPC contracts (implemented)

| RPC | Authz | Behaviour | Returns |
|-----|-------|-----------|---------|
| `next_document_number(org, kind)` | `can_write_org` | `FOR UPDATE` sequence; increment; return prior `next_value` | `int` |
| `book_sales_invoice(org, invoice_id)` | `can_write_org` | Lock invoice; fail if booked; USt groups → journal+lines+links; stock out if `tracks_stock`; set `booked_at`; `already_booked` on retry | first `journal_entry` uuid |
| `book_vendor_invoice(org, invoice_id)` | `can_write_org` | Analog; groups by expense_account+vat; credit `1600`; expense must be `aufwand` | first `journal_entry` uuid |
| `record_sales_payment(...)` | `can_write_org` | Requires booked; natural-key idempotent retry; overpay check; journal Bank→1400 + payment + link | `payment` uuid |
| `record_vendor_payment(...)` | `can_write_org` | Same; Debit 1600 / Credit bank | `payment` uuid |

**Payment natural key:** `(invoice_id, payment_date, amount_cents, bank_account, coalesce(reference,''))` — lookup only (no new column).

**Still stubs:** `record_goods_receipt`, `post_learning_practice`, `import_workspace`.

---

## Local tests actually run

**Command:** `supabase/sql/local_review/run_local_review.sh` against local PostgreSQL 16 (`nordlicht_review_local`).  
**No remote Supabase.**

| Suite | Passed | Failed | Total |
|-------|--------|--------|-------|
| Negative / fixtures (`review_results`) | 16 | 0 | 16 |
| Booking RPCs (`booking_rpc_results`) | 26 | 0 | 26 |
| **Combined** | **42** | **0** | **42** |

Artifacts: `supabase/sql/local_review/out/summary.txt`, `review_results.csv`, `booking_rpc_results.csv`, `06_security_checks.stdout` (all Expect-0 queries empty).

Coverage highlights: AR/ER book+pay success, double book, payment idempotency, overpay, empty lines, multi-VAT, teacher/anon/outsider, booked immutability, tax/rounding note, mid-txn rollback (doc-number collision), direct write revoke, journal balance trigger.

---

## E2E prep notes (not run)

Not executed in this task — preparation only:

1. Isolated review project only (never handels/TrueFuel) after **explicit** go-ahead.
2. Apply migrations in order: schema → RLS → grants → booking_rpcs.
3. Create Auth users; exercise `/rest/v1/rpc/book_sales_invoice` with user JWT (anon key must fail EXECUTE / RLS).
4. Compare service_role vs authenticated; confirm PostgREST does not expose `_nl_*` or trigger fns.
5. Do **not** claim E2E pass until those calls are actually run and logged.

---

## Residual risks

1. Gross-helper vs group-tax divergence on fractional quantities (payments vs journal).
2. Concurrent payment retries without unique index on natural key (race possible; lookup idempotent under serializable-ish retry).
3. Goods receipt / learning / import still stubs — direct goods_receipt inserts still granted.
4. DEFINER RPCs rely on migrator/superuser owner to bypass FORCE RLS — same pattern as `create_organization`.
5. No Storno/correction RPC yet.
6. App still localStorage — no client wired to RPCs.

---

## Next approval step

**Remote apply only after explicit human go-ahead**, targeting a dedicated Nordlicht review/handels project — never TrueFuel / never silent apply. Suggested gate: re-run local harness green → review this report → approve remote migration order → then Auth/PostgREST smoke (separate task).

**Stop:** no remote deploy, pause, or delete performed.
