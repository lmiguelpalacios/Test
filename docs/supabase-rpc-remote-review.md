# Supabase RPC Remote Review — Controlled Apply Results

**Stand:** 2026-10-14  
**Branch / PR:** `cursor/supabase-rpc-hardening-2188` — [PR #2](https://github.com/lmiguelpalacios/Test/pull/2) (draft)  
**Freigabe:** User-approved controlled Review-DB deployment (grants + booking RPCs only)  
**Verdict Review-Env:** **PASS** (with documented limitations)  
**Produktives Deploy:** **nicht freigegeben** — stop; await next approval

---

## Verified target

| Feld | Wert |
|------|------|
| Name | `nordlicht-security-review` |
| project_id / ref | `tbxdoapspjhabcsxgllx` |
| Organisation | Nordlicht (`iwolvmzjskpgzuiddewn`) |
| Region | `eu-central-1` |
| Status (pre + post) | `ACTIVE_HEALTHY` |
| Postgres | 17.11 |

**Untouched (confirmed):**

| Project | Ref | Notes |
|---------|-----|-------|
| `nordlicht-handels` | `kicwytgtrdadrhhlfrnn` | Identity-only `get_project` peek; **no** migrations, SQL, pause, or delete |
| TrueFuel v0.1 | `ipblsxncnwyizdxudtrc` | Listed as `INACTIVE`; **no** writes |

Review project **left running** (`ACTIVE_HEALTHY`). Not paused or deleted.

---

## Preflight (mandatory)

| Check | Result |
|-------|--------|
| `get_project` name/ref/org/region/status | PASS — matches exact target |
| `list_migrations` before apply | Only `nordlicht_schema_v1` + `nordlicht_rls_v1` |
| Schema/RLS objects present | 26 tables, 26 RLS on, 81 policies — **not** re-applied |
| Booking RPCs absent | PASS — no `book_*` / `record_*` / `next_document_number` |
| Index `document_journal_links_one_booking_idx` | Present (to be dropped by booking migration) |
| anon table grants (pre) | 182 (defaults; grants migration expected to clear) |
| Migration file checksums (PR branch) | `nordlicht_grants_v1.sql` sha256 `3440b38e…c9a8`; `nordlicht_booking_rpcs_v1.sql` sha256 `c17d958f…3f0c` |
| Unexpected grants/booking history | None — proceed |
| Local harness `run_local_review.sh` | **Not re-run** in this agent env (`sudo -u postgres` unavailable). Prior checklist: 42/42 |

---

## Migrations applied (this run only)

| Order | Source file | History name | Version | Apply path |
|-------|-------------|--------------|---------|------------|
| 1 | `supabase/migrations/20261013140000_nordlicht_grants_v1.sql` | `nordlicht_grants_v1` | `20261014071224` | Full file via `apply_migration` |
| 2a | `…140100_nordlicht_booking_rpcs_v1.sql` (helpers + `next_document_number` + index drop) | `nordlicht_booking_rpcs_v1` | `20261014071336` | `apply_migration` (first chunk; MCP payload size) |
| 2b | Remainder of same file (`book_*`, `record_*`, EXECUTE grants, journal/payment/stock revokes) | — | — | Chunked `execute_sql` |
| 2c | Honest no-op marker | `nordlicht_booking_rpcs_v1_complete` | `20261014071604` | `apply_migration` documenting chunked completion |

**Not applied:** `nordlicht_schema_v1`, `nordlicht_rls_v1`, `rpc_booking_stubs.sql`, any React/localStorage changes.

### Final `list_migrations` on `tbxdoapspjhabcsxgllx`

1. `20261013114928` `nordlicht_schema_v1`  
2. `20261013115619` `nordlicht_rls_v1`  
3. `20261014071224` `nordlicht_grants_v1`  
4. `20261014071336` `nordlicht_booking_rpcs_v1`  
5. `20261014071604` `nordlicht_booking_rpcs_v1_complete`

---

## Post-apply catalog / security verify

| Check | Result |
|-------|--------|
| Five core RPCs exist | PASS — DEFINER + `search_path=public` |
| `_nl_*` helpers exist | PASS — EXECUTE revoked from public/anon/authenticated |
| anon table grants | **0** |
| authenticated INSERT/UPDATE/DELETE on journal/payments/stock/links | **0** |
| anon EXECUTE on five RPCs / `_nl_tax_cents` | **0** |
| authenticated EXECUTE on five RPCs | **5** |
| Index `document_journal_links_one_booking_idx` | **gone** |
| Policies | 81 (unchanged) |
| User triggers | 7 (unchanged) |
| Seed catalogs | `account_templates`=24, `learning_tasks`=12 retained |

---

## Integration tests (synthetic SQL only)

**Method:** Synthetic `auth.users` (`*@rpc.review.test`), JWT via `set_config('request.jwt.claim.sub'|claims)` + `SET LOCAL ROLE authenticated|anon`. **No** Auth Admin API, **no** PostgREST HTTP.

| case_id | ok | detail |
|---------|----|--------|
| FIX_ORGS | PASS | org A/B created |
| SEQ_NEXT | PASS | seq1=1 seq2=2 |
| SEQ_TEACHER_FORBIDDEN | PASS | teacher sequence denied |
| ANON_BOOK_DENIED | PASS | anon book denied |
| CROSS_ORG_FORBIDDEN | PASS | org-b owner on org-a denied |
| DIRECT_JOURNAL_DENIED | PASS | authenticated journal insert denied |
| AR_BOOK | PASS | journal + link + lines + booked_at |
| AR_DOUBLE_BOOK | PASS | already_booked |
| ZE_IDEMPOTENT | PASS | same payment id on retry; gross=2380 |
| ZE_OVERPAY | PASS | overpay rejected |
| AR_MULTI_VAT | PASS | links=2 |
| ER_BOOK | PASS | vendor book + booked_at |
| ZA_OK | PASS | vendor payment recorded |
| ER_BAD_EXPENSE_ROLLBACK | PASS | no journal delta; booked_at null |
| DIRECT_PAYMENT_DENIED | PASS | sales_payments insert denied |

**Score:** 15/15 PASS. **Failures:** none.

### Cleanup

Synthetic orgs, members, invoices, journals, payments, stock, products, customers, suppliers, sequences, accounts, profiles, and auth users removed (`session_replication_role=replica` only for booked-line delete). Results table dropped. Residuals verified **0**. Seed catalogs retained.

---

## Not run / residual risks

| Item | Status |
|------|--------|
| Auth/PostgREST E2E (real JWT, anon-key HTTP) | **Not run** — do not claim |
| Local harness 42/42 in this env | **Not re-run** (no local postgres role) |
| Concurrent payment duplicate (no unique index) | Residual risk (known) |
| Gross helper vs group USt fractions | Residual risk (known) |
| Goods / learning / import RPCs | Still stubs / not deployed |
| Storno RPC | Absent |
| Production / handels deploy | **Out of scope — not approved** |

---

## Stop note

Controlled Review-DB apply of the **two** new migrations is **complete** on `tbxdoapspjhabcsxgllx`.  
**Await next explicit approval** before: Auth/PostgREST E2E gate, any further migrations, or any touch of `nordlicht-handels` / TrueFuel / productive deploy.  
Project left **running**.

