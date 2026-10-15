# Payment idempotency — remote review apply

**Stand:** 2026-10-14  
**Branch / PR:** `cursor/supabase-rpc-hardening-2188` — [PR #2](https://github.com/lmiguelpalacios/Test/pull/2) (draft)  
**Freigabe:** User-approved controlled apply of payment idempotency migration on review ONLY  
**Target only:** `nordlicht-security-review` (`tbxdoapspjhabcsxgllx`)  
**Untouched:** `nordlicht-handels` (`kicwytgtrdadrhhlfrnn`), TrueFuel (`ipblsxncnwyizdxudtrc`)  
**Applied:** **YES** — single migration `nordlicht_payment_idempotency_v1`  
**Productive / handels deploy:** **not approved** — stop after this report

---

## Verdict

| Gate | Result |
|------|--------|
| Applied on review | **YES** |
| Test score | **22/22 PASS** (0 fail) |
| Review left running | **ACTIVE_HEALTHY** |
| handels / TrueFuel | **untouched** (identity-only peek) |
| Halt before apply | **no** — all preflight gates passed |
| Approach retained | Natural-key unique indexes (not opaque `idempotency_key`) |

---

## Preflight (mandatory)

| Check | Result |
|-------|--------|
| `get_project` | `nordlicht-security-review` / `tbxdoapspjhabcsxgllx` / org `iwolvmzjskpgzuiddewn` / `eu-central-1` / **ACTIVE_HEALTHY** / PG 17.11 |
| `list_migrations` before | schema, rls, grants, booking_rpcs (+ complete) — **no** `payment_idempotency` |
| SQL vs PR tip `cursor/supabase-rpc-hardening-2188` | sha256 `0f3640303eae12c24c71590533e68c490f50a54876aa60891e704407afea5bf3` — **exact match** (diff empty) |
| Duplicate natural-key groups `sales_payments` | **0** (table empty) |
| Duplicate natural-key groups `vendor_payments` | **0** (table empty) |
| Residual orgs/payments before apply | **0** |
| handels peek | `ACTIVE_HEALTHY` — no SQL/migrations |
| TrueFuel peek | `INACTIVE` — no SQL/migrations |

### Fachliche natural-key validation (before apply)

Natural key matches existing RPC lookup:

```
(organization_id, invoice_id, payment_date, amount_cents, bank_account, coalesce(reference, ''))
```

| Criterion | Assessment |
|-----------|------------|
| Legitimate Teilzahlungen (different amount/date/bank/ref) | **Allowed** — confirmed against `record_*_payment` + local 59/59 suite |
| Same amount+date+bank+empty/NULL ref | Collapses as retry (documented edge case; client must supply distinct `reference`) |
| Opaque `idempotency_key` needed? | **No** — key already fachlich aligned with RPC contract; not too restrictive for intended Teilzahlungen |

**Decision:** proceed with apply (do not halt for `idempotency_key` redesign).

---

## Migration applied

| Field | Value |
|-------|-------|
| Source file | `supabase/migrations/20261014100000_nordlicht_payment_idempotency_v1.sql` |
| `apply_migration` name | `nordlicht_payment_idempotency_v1` |
| History version | `20261014085142` |
| Objects | `sales_payments_natural_key_uidx`, `vendor_payments_natural_key_uidx` |
| RPC / App / other migrations | **none** |

### Final `list_migrations` on `tbxdoapspjhabcsxgllx`

1. `20261013114928` `nordlicht_schema_v1`  
2. `20261013115619` `nordlicht_rls_v1`  
3. `20261014071224` `nordlicht_grants_v1`  
4. `20261014071336` `nordlicht_booking_rpcs_v1`  
5. `20261014071604` `nordlicht_booking_rpcs_v1_complete`  
6. `20261014085142` `nordlicht_payment_idempotency_v1`

---

## Tests run

**Method:** Synthetic SQL (`request.jwt.claim.sub` + `SET LOCAL ROLE authenticated`) for sequential/constraint cases; real Auth password grant + PostgREST HTTP (`ThreadPoolExecutor`) for parallel ZE/ZA. Marker: org slug `payidem-a1b2c3`, user `nordlicht.payidem.owner.a1b2c3@gmail.com`.

| case_id | ok | detail (abbrev.) |
|---------|----|------------------|
| IDX_SALES_PRESENT | PASS | index present |
| IDX_VENDOR_PRESENT | PASS | index present |
| FIX_ORG | PASS | org created |
| FIX_MASTER | PASS | customer/product/supplier |
| ZE_TEIL_DISTINCT | PASS | two distinct Teilzahlungen |
| ZE_TEIL_TWO_ROWS | PASS | rows=2 |
| ZE_RETRY_SAME_ID | PASS | identical retry → same id |
| ZE_RETRY_NO_EXTRA_ROW | PASS | rows still 2 |
| ZE_SAME_AMT_DIFF_REF | PASS | same amount, different reference → new row |
| ZE_THREE_ROWS | PASS | rows=3 |
| ZE_NULL_EMPTY_COALESCE | PASS | NULL/`''` same id |
| ZE_NULL_EMPTY_SINGLE_ROW | PASS | rows=1 |
| ZE_BOOKING_INTEGRITY | PASS | payments=4 links=4 |
| ZE_UNIQUE_BLOCKS_DUP | PASS | unique_violation on direct insert |
| ZA_TEIL_AND_RETRY | PASS | two Teil + retry same id |
| ZA_TWO_ROWS | PASS | rows=2 |
| ZA_UNIQUE_BLOCKS_DUP | PASS | unique_violation |
| PARALLEL_SEED | PASS | booked unpaid ZE invoice |
| ZE_PARALLEL | PASS | both HTTP 200, same id, 1 row |
| ZE_PARALLEL_RETRY | PASS | retry same id |
| ZA_PARALLEL | PASS | both HTTP 200, same id, 1 row |
| ZA_PARALLEL_RETRY | PASS | retry same id |

**Score:** **22/22 PASS**. Failures: none.

### Cleanup

Attributed delete of payidem org + dependents + synthetic auth user/profile/identity. Temporary DISABLE/ENABLE of booking-immutability triggers only for booked-line delete (MCP cannot set `session_replication_role`). Results/seed helper tables dropped.

| Residual | Count |
|----------|------:|
| auth.users / profiles / orgs / members | **0** |
| payments / invoices / journal / links / master | **0** |
| `account_templates` / `learning_tasks` | **24** / **12** (retained) |
| natural-key indexes | **2** (retained) |
| booking immutability triggers enabled | **4** |

---

## Residual risks

| Risk | Notes |
|------|-------|
| Equal-amount same-day empty-ref Teilzahlungen | Still require distinct `reference`; otherwise treated as retry |
| Unique violation vs RPC retry on lock-bypass path | Second insert may raise `unique_violation` instead of returning existing id — no duplicate row; optional later: catch + re-select in RPC |
| Gross-helper vs group USt | Unrelated residual |
| Goods / Storno / learning RPCs | Still stubs / absent |
| handels / productive | **Out of scope — not approved** |

---

## Confirmations

- **Applied:** yes (`tbxdoapspjhabcsxgllx` only)
- **Test score:** 22/22 PASS
- **Paths:** repo + store `docs/supabase-payment-idempotency-remote-review.md`
- **handels / TrueFuel:** untouched
- **Review:** left **ACTIVE_HEALTHY** (not paused/deleted)
- **Stop:** no productive deploy; await next explicit approval
