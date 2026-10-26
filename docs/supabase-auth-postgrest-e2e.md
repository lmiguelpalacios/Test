# Auth + PostgREST E2E — nordlicht-security-review

**Stand:** 2026-10-14  
**Branch / PR:** `cursor/supabase-rpc-hardening-2188` — [PR #2](https://github.com/lmiguelpalacios/Test/pull/2) (draft)  
**Freigabe:** User-approved controlled Auth/PostgREST E2E on review ONLY  
**Target only:** `nordlicht-security-review` (`tbxdoapspjhabcsxgllx`)  
**Untouched:** `nordlicht-handels` (`kicwytgtrdadrhhlfrnn`), TrueFuel (`ipblsxncnwyizdxudtrc`)  
**No migrations / schema / grant / RPC changes this run.**  
**Plan followed:** store `docs/supabase-e2e-cleanup-and-plan.md` + remote-review notes.

---

## Verdict

| Gate | Result |
|------|--------|
| Auth/PostgREST E2E score | **37/37 PASS** (0 fail, 0 skip) |
| Critical parallel book (`AR_PARALLEL`, `ER_PARALLEL`) | **PASS** — exactly one journal/link set; loser `already_booked` |
| Critical parallel payment (`ZE_PARALLEL`, `ZA_PARALLEL`) | **PASS** — single natural-key row; both HTTP calls returned same id |
| ZE parallel stress (5 extra pairs) | **PASS** — 0 duplicates |
| Review project left running | **ACTIVE_HEALTHY** |
| handels / TrueFuel | **untouched** (identity-only peek) |
| Productive deploy | **not approved by this report** — review gate only |

**RPC readiness for later productive deploy (honest):**  
Review Auth/HTTP path is **green**, including the previously feared parallel-payment gap under same-invoice contention (`FOR UPDATE` on the invoice row serializes lookup→insert). Residual: **no unique index** on payment natural keys — defense is lock-based, not constraint-based; a unique index remains a hardening recommendation before handels. Gross-helper vs group-USt fractions and missing Storno/goods RPCs are unchanged residuals. **Do not treat this as handels freigabe.**

---

## Preflight

| Check | Result |
|-------|--------|
| `get_project` review | `nordlicht-security-review` / `tbxdoapspjhabcsxgllx` / `eu-central-1` / `ACTIVE_HEALTHY` / PG 17.11 |
| handels peek | `ACTIVE_HEALTHY` — no SQL/migrations |
| TrueFuel peek | `INACTIVE` — no SQL/migrations |
| Residuals before run | auth/profiles/orgs/business **0**; seeds `account_templates`=24, `learning_tasks`=12 |
| Unexpected non-test data | **none** — proceed |

---

## Method (real Auth + PostgREST HTTP)

| Step | How |
|------|-----|
| Users | 7 synthetic `nordlicht.e2e.<role>.c4f91a@gmail.com` inserted into `auth.users` + `auth.identities` (Admin signup blocked by email rate limit; password grant still issues real JWTs) |
| Tokens | `POST /auth/v1/token?grant_type=password` with **anon** apikey → user `access_token` (tokens redacted in logs; **no service_role** published) |
| Seed | Authenticated `create_organization` (owner_a / owner_b) → members → customers/suppliers/products via PostgREST (RLS path) |
| RPCs | `POST /rest/v1/rpc/<name>` with Bearer user JWT + anon apikey |
| Parallel | Two concurrent HTTP clients (`ThreadPoolExecutor`) |
| Integrity | PostgREST SELECT counts + SQL natural-key duplicate checks |
| Cleanup | Attributed delete of run orgs (`e2e-org-%c4f91a%`) + 7 users; `session_replication_role=replica` only for booked-line delete |

**Roles:** owner_a, owner_b, student_a, teacher_a, viewer_a, outsider, nomember.

---

## Results table

| ID | Status | Detail (abbrev.) |
|----|--------|------------------|
| ANON_RPC_next_document_number | PASS | 401 permission denied |
| ANON_RPC_book_sales_invoice | PASS | 401 permission denied |
| ANON_RPC_book_vendor_invoice | PASS | 401 permission denied |
| ANON_RPC_record_sales_payment | PASS | 401 permission denied |
| ANON_RPC_record_vendor_payment | PASS | 401 permission denied |
| ANON_TABLE | PASS | 401 no SELECT grant on `sales_invoices` |
| TEACHER_SEQ | PASS | 400 `forbidden` |
| TEACHER_BOOK | PASS | 400 `forbidden` |
| TEACHER_PAY | PASS | 400 `forbidden` |
| CROSS_ORG | PASS | owner_b → org A: `forbidden` |
| OUTSIDER | PASS | `forbidden` |
| NOMEMBER | PASS | `forbidden` |
| VIEWER_BOOK | PASS | `forbidden` |
| HELPER_HIDDEN | PASS | 404 `_nl_tax_cents` not in schema cache / not exposed |
| SEQ_NEXT | PASS | seq 1 → 2 |
| AR_BOOK | PASS | journal balanced; links=1; stock out; `booked_at` set |
| AR_DOUBLE | PASS | `already_booked`; journal count unchanged |
| **AR_PARALLEL** | **PASS** | 1 success + 1 `already_booked`; je_delta=1; links=1; stock_delta=1 |
| AR_MULTI_VAT | PASS | links=3 (0/7/19 groups); booked |
| AR_IMMUTABLE | PASS | PATCH lines after book → 0 rows |
| ZE_OK | PASS | payment + ZE journal |
| ZE_IDEMPOTENT | PASS | sequential retry same payment id; 1 row |
| **ZE_PARALLEL** | **PASS** | 1 row; both HTTP 200 return same id |
| ZE_OVERPAY | PASS | overpay rejected |
| ZE_UNBOOKED | PASS | pay before book rejected |
| ER_BOOK | PASS | booked + journal |
| **ER_PARALLEL** | **PASS** | 1 success + 1 `already_booked`; je_delta=1; links=1 |
| ER_BAD_EXPENSE | PASS | full rollback; `booked_at` null; no journal delta |
| ZA_OK | PASS | vendor payment recorded |
| ZA_IDEMP | PASS | sequential retry same id; 1 row |
| **ZA_PARALLEL** | **PASS** | 1 row; both HTTP 200 return same id |
| INVALID_AMOUNT | PASS | amount ≤ 0 rejected |
| INVALID_BANK | PASS | bad bank account rejected |
| INVALID_NO_LINES | PASS | empty invoice; no partial book |
| DIRECT_JOURNAL | PASS | 403 permission denied |
| DIRECT_PAYMENT | PASS | 403 permission denied |
| DIRECT_LINKS | PASS | 403 permission denied |

**Failed / skipped:** none.

### Extra stress (not separate scored cases)

| Check | Result |
|-------|--------|
| ZE parallel ×5 on fresh booked invoices | **0 duplicates**; each pair → 1 payment id |
| SQL natural-key dup groups (sales + vendor) | **0** |

---

## Critical idempotency analysis

Unique index `document_journal_links_one_booking_idx` is **gone** (by design). Observed HTTP behavior:

1. **Parallel book:** `SELECT … FOR UPDATE` on the invoice row + final conditional `UPDATE … booked_at IS NULL` → second waiter sees booked row → `already_booked`. No double journal/stock in this run.
2. **Parallel payment:** same invoice `FOR UPDATE` serializes the natural-key lookup before insert → second caller finds the first payment and returns its id. **No duplicate rows** in main test or 5 stress rounds.

**Interpretation:** under real PostgREST, same-invoice parallel payment is **not** currently FAILING. The earlier “known gap” (lookup without unique index) is **mitigated by row locks** for same-invoice concurrency. Remaining risk: absent unique constraint means bugs that skip/bypass the lock path, or future RPC edits, could still insert duplicates — recommend adding a unique index on the natural key before productive deploy as belt-and-suspenders.

---

## Open risks (unchanged / residual)

| Risk | Status after E2E |
|------|------------------|
| Parallel payment without unique index | **Observed PASS** via `FOR UPDATE`; unique index still recommended |
| Multi-VAT link count | Confirmed links = VAT groups (3) |
| Gross helper vs group USt fractions | Not re-litigated; known remote-review residual |
| Goods / learning / import / Storno RPCs | Still stubs / absent |
| Email Auth Admin signup | Rate-limited on review; SQL+password grant used as Auth JWT path |
| Production / handels | **Out of scope** |

---

## Cleanup / residuals

| Table | Count after cleanup |
|-------|--------------------:|
| auth.users / identities / profiles | **0** |
| orgs / members / business tables | **0** |
| account_templates / learning_tasks | **24** / **12** (retained) |

Review project **left running** (`ACTIVE_HEALTHY`). Not paused or deleted.

---

## Confirmations

- PASS **37** / FAIL **0** / SKIP **0**  
- Critical idempotency: **PASS** (books + payments; stress 0 dups)  
- Report paths: repo `docs/supabase-auth-postgrest-e2e.md`; store copy same name under Project `docs/`  
- **handels / TrueFuel untouched**  
- **No service_role secrets** in frontend/git/logs  
- **Stop** after this report — no productive deploy
