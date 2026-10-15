# Payment idempotency hardening (ZE / ZA)

**Stand:** 2026-10-14  
**Branch / PR:** `cursor/supabase-rpc-hardening-2188` — [PR #2](https://github.com/lmiguelpalacios/Test/pull/2) (draft)  
**Scope:** Local SQL only — **no** remote apply, **no** changes to review/handels/TrueFuel projects  
**Prior context:** Auth/PostgREST E2E showed lock-based parallel payment PASS, but **no unique index** on payment natural keys ([E2E report](./supabase-auth-postgrest-e2e.md)).

---

## Verdict

| Decision | Detail |
|----------|--------|
| Approach | **Natural-key unique expression indexes** (not a new `idempotency_key` column) |
| Why not opaque key | Existing RPC contract already treats `(invoice_id, payment_date, amount_cents, bank_account, coalesce(reference,''))` as the retry identity; inventing a client-supplied key would change the API without fachlich need |
| Teilzahlungen | **Allowed** when amount, date, bank, or reference differs |
| RPC bodies | **Unchanged** — coalesce/nullif path already matches the index expression |
| Remote | **Zero** — migration + tests exist in repo only |

---

## Natural key (fachlich)

Enforced index columns (org-scoped; matches `record_sales_payment` / `record_vendor_payment` lookup):

```
(organization_id, invoice_id, payment_date, amount_cents, bank_account, coalesce(reference, ''))
```

| Scenario | Result |
|----------|--------|
| Identical retry (same date/amount/bank/ref) | Same payment id; one row |
| Teilzahlung A then B (different amounts or refs) | Two rows |
| Same amount, different `reference` (Verwendungszweck) | Two rows |
| `reference` NULL vs `''` | Same key after coalesce; one row |
| Two intentional equal-amount same-day payments with empty ref | Collapsed as retry — client must supply distinct `reference` |

That last edge case is accepted: without a bank end-to-end id in the schema, empty-ref equal payments are indistinguishable from retries. Distinct Verwendungszweck keeps legitimate Teilzahlungen open.

---

## Implementation

| Artifact | Role |
|----------|------|
| `supabase/migrations/20261014100000_nordlicht_payment_idempotency_v1.sql` | `sales_payments_natural_key_uidx`, `vendor_payments_natural_key_uidx` |
| Existing `…_booking_rpcs_v1.sql` | Unchanged — `FOR UPDATE` invoice row + natural-key lookup remain |
| Existing schema/rls/grants v1 | Unchanged |

Indexes use `IF NOT EXISTS` and expression `coalesce(reference, '')` so NULL and empty string collide the same way as the RPC.

**Defense in depth:** invoice `FOR UPDATE` serializes same-invoice payment RPCs; unique index rejects any insert path that bypasses the lookup (or future regressions that drop the lock).

---

## Local tests run

**Command:** `supabase/sql/local_review/run_local_review.sh` against local PostgreSQL 16 (`nordlicht_review_local`).  
**No remote Supabase.**

| Suite | Passed | Failed | Total |
|-------|--------|--------|-------|
| Negative / fixtures (`review_results`) | 16 | 0 | 16 |
| Booking RPCs (`booking_rpc_results`) | 26 | 0 | 26 |
| Payment idempotency (`payment_idempotency_results`) | 17 | 0 | 17 |
| **Combined** | **59** | **0** | **59** |

Idempotency coverage (`30_payment_idempotency_tests.sql` + harness parallel step):

| Case | Result |
|------|--------|
| ZE Teilzahlungen distinct amounts | PASS |
| ZE identical retry | PASS (same id, no extra row) |
| ZE same amount different ref | PASS |
| ZE NULL/`''` reference coalesce | PASS |
| ZE unique index blocks direct dup insert | PASS |
| ZA Teilzahlungen + retry | PASS |
| ZA unique index blocks dup | PASS |
| ZE parallel two psql sessions same key | PASS (one id, one row) |

Artifacts: `supabase/sql/local_review/out/payment_idempotency_results.csv`, `summary.txt`, sibling count files.

---

## Open risks

| Risk | Notes |
|------|-------|
| Equal-amount same-day empty-ref Teilzahlungen | Require distinct `reference`; otherwise treated as retry |
| Unique violation vs RPC retry | With `FOR UPDATE`, same-invoice parallels resolve via lookup; if a path skips the lock, second insert may raise `unique_violation` instead of returning existing id (no duplicate row). Optional later: catch unique_violation in RPC and re-select |
| Pre-existing duplicate rows on target DB | Index create fails until duplicates cleaned — check before review apply |
| Gross-helper vs group USt | Unrelated residual from prior review |
| Goods / Storno / learning RPCs | Still stubs |

---

## Migration risks for later review apply

**Do not apply in this task.** When explicitly approved for `nordlicht-security-review` only:

1. Confirm target is review (`tbxdoapspjhabcsxgllx`) — never handels (`kicwytgtrdadrhhlfrnn`) or TrueFuel (`ipblsxncnwyizdxudtrc`).
2. Preflight: `SELECT` duplicate natural-key groups on `sales_payments` / `vendor_payments` (expect 0 after E2E cleanup).
3. Apply **only** `20261014100000_nordlicht_payment_idempotency_v1.sql` (additive indexes).
4. Re-smoke ZE/ZA sequential retry + one parallel pair via PostgREST.
5. Leave handels untouched.

`CREATE UNIQUE INDEX` on empty/clean payment tables is low-risk (non-rewriting of RPC/grant/RLS). Concurrent writes during index build on a busy prod DB would need `CONCURRENTLY` — review DB is fine with the plain statement in the migration file.

---

## Confirmations

- Approach: natural-key unique indexes (no invented `idempotency_key`)
- Migration path: `supabase/migrations/20261014100000_nordlicht_payment_idempotency_v1.sql`
- Local tests: **59/59 PASS**
- Report paths: repo + store `docs/supabase-payment-idempotency.md`
- **Zero remote:** no `apply_migration` / `execute_sql` / project pause-restore; review, handels, TrueFuel untouched
