# Nordlicht — Production migration check (`nordlicht-handels`)

**Stand:** 2026-10-15  
**Check type:** READ-ONLY on production · no apply · no deploy  
**Repo tip:** `cursor/supabase-app-integration-2188` @ `3fa66fa` (PR #3)  
**Production:** `nordlicht-handels` / `kicwytgtrdadrhhlfrnn`  
**Review (comparison):** `nordlicht-security-review` / `tbxdoapspjhabcsxgllx`  
**TrueFuel:** `ipblsxncnwyizdxudtrc` — **untouched**

---

## Verdict

**freigabefähig** — for an **empty** handels DB (verified), apply the six local migrations in order after **explicit human freigabe**.

| Gate | Result |
|------|--------|
| handels `list_migrations` | `[]` |
| handels public tables / functions / policies / triggers / indexes | **0 / 0 / 0 / 0 / 0** |
| handels auth users / identities / sessions | **0 / 0 / 0** |
| Partial Nordlicht apply beyond history | **None detected** |
| Review expected schema / RPCs / indexes / grants | **Match** (26/26 tables; booking + app RPCs; natural-key indexes; journal/payment DML revoked) |
| Destructive risk on empty prod | **Low** (DDL + seed templates; no TRUNCATE/DELETE of user data) |
| Collision risk (unique indexes) on empty prod | **None** (no rows) |
| This check wrote to handels / TrueFuel | **No** |

**Not claimed:** migrations applied; production Pages pointing at handels; Auth Site URL configured on handels.

---

## 1. Six migrations — filenames, order, dependencies

Source of truth: `supabase/migrations/` on `3fa66fa`.

| # | Exact filename | SHA-256 | Depends on | Intent |
|---|---------------|---------|------------|--------|
| 1 | `20261012120000_nordlicht_schema_v1.sql` | `6cbfe575e350c53fb3d7ec35ac77a7111d3f1bdd0d101f2e3c8a96f2ec661334` | empty `public` (+ platform `pgcrypto` OK) | 26 tables, triggers, seed `account_templates`, `create_organization` / seed helpers |
| 2 | `20261012120100_nordlicht_rls_v1.sql` | `1413699f0a8857e20892de272b6c6c0d626f3876b931e5484e08881c23a41110` | #1 | Org helpers + FORCE RLS + policies (81 `create policy`) |
| 3 | `20261013140000_nordlicht_grants_v1.sql` | `3440b38ecfdc821ff96d41eacb490eed2d3f07aa3e6786f2cb45e28a2b24c9a8` | #1+#2 | `anon` revoke; `authenticated` least-privilege table/function grants |
| 4 | `20261013140100_nordlicht_booking_rpcs_v1.sql` | `c17d958faf893c5175398c46a5d696392fc92777459af7caf57ac64189203f0c` | #1–#3 | Booking/payment RPCs; drop one-booking index; revoke journal/payment/stock client DML |
| 5 | `20261014100000_nordlicht_payment_idempotency_v1.sql` | `0f3640303eae12c24c71590533e68c490f50a54876aa60891e704407afea5bf3` | #1+#4 | Unique natural-key indexes on `sales_payments` / `vendor_payments` |
| 6 | `20261014120000_nordlicht_app_rpcs_v1.sql` | `a6aa6c6f58347cabdf100a01a41ed25c8a078ecb5218b1a4de5b54e771d178c8` | #1–#4 (`next_document_number`, `can_write_org`) | `record_goods_receipt`, `import_workspace` |

**Apply order is strict.** Do not skip, reorder, or apply only a subset. Do not use review’s remote history versions as filenames — remote versions differ; **local filenames** are the apply source.

---

## 2. handels — migration history + schema state (READ-ONLY)

**Identity (MCP `get_project`):**

| Field | Value |
|-------|-------|
| name | `nordlicht-handels` |
| ref / id | `kicwytgtrdadrhhlfrnn` |
| status | `ACTIVE_HEALTHY` |
| region | `eu-central-1` |
| Postgres | 17.11 |
| API URL | `https://kicwytgtrdadrhhlfrnn.supabase.co` |

**History:** `list_migrations` → **empty array**.

**Catalog SELECTs (no writes):**

| Metric | Value |
|--------|-------|
| `public` tables | 0 |
| `public` functions | 0 |
| `public` triggers | 0 |
| `public` policies | 0 |
| `public` indexes | 0 |
| `auth` Nordlicht trigger (`on_auth_user_created` / `handle_new_user`) | 0 |
| `supabase_migrations` schema | absent |
| `auth.users` / identities / sessions | 0 / 0 / 0 |
| `pgcrypto` extension | present (platform default; **not** evidence of Nordlicht schema) |
| Security advisors | `[]` (empty project) |

---

## 3. Compare expected vs handels vs review

### Expected (from local #1–#6)

- **26** `public` tables (profiles → import_batches)
- RLS helpers: `is_org_member`, `org_member_role`, `has_org_role`, `can_write_org` (DEFINER, `search_path=public`)
- Roles: `owner` | `teacher` | `student` | `viewer`; writers = `owner`+`student` via `can_write_org`
- Booking RPCs: `next_document_number`, `book_sales_invoice`, `book_vendor_invoice`, `record_sales_payment`, `record_vendor_payment`
- App RPCs: `record_goods_receipt`, `import_workspace`
- Booked immutability: triggers + RLS `booked_at IS NULL` on invoice update/delete paths
- Payment idempotency: `sales_payments_natural_key_uidx`, `vendor_payments_natural_key_uidx`
- After #4: `authenticated` has **SELECT only** on journal/payments/stock/links (no INSERT/UPDATE/DELETE)

### handels today vs expected

| Area | Expected | handels | Gap |
|------|----------|---------|-----|
| Tables | 26 | 0 | **full gap** — apply #1 |
| RLS / policies | enabled + policies | none | apply #2 |
| Grants | least privilege | n/a | apply #3 then #4 revoke |
| Booking RPCs | 5 | none | apply #4 |
| Payment unique indexes | 2 | none | apply #5 |
| App RPCs | 2 | none | apply #6 |

### review vs expected (read-only comparison)

| Check | Result |
|-------|--------|
| `list_migrations` | 7 entries (see §4) — all six intents present |
| Tables | **26/26** names match; all `rls_enabled=true` |
| Natural-key indexes | **present** with `COALESCE(reference,'')` |
| `document_journal_links_one_booking_idx` | **absent** (correct after booking RPC) |
| Booking + app RPCs | DEFINER + `search_path=public` |
| EXECUTE | `authenticated` yes; `anon` no on checked RPCs; `_nl_*` / `handle_new_user` not executable by anon/authenticated |
| Protected table grants | journal/payments/stock/links/sequences: **SELECT only** for `authenticated` |
| `anon` table grants | **0** |
| Booked immutability triggers | present on sales/vendor invoices + lines + payment rules + journal balance |
| Org isolation sample policies | `is_org_member` / `can_write_org` / `has_org_role(..., owner|teacher)` as designed |
| `post_learning_practice` | **not** in migrations / not on review (stub elsewhere; UI disabled) |

**Review residual advisors (known, non-blocking for empty handels apply):**

- WARN: `_nl_*` mutable `search_path` (5 helpers; EXECUTE revoked from clients)
- WARN: intentional DEFINER RPCs callable by `authenticated` (app surface)
- WARN: Auth leaked-password protection disabled (Auth config — ops)

---

## 4. Partial / full prior apply detection

| Signal | handels | Interpretation |
|--------|---------|----------------|
| Migration history count | 0 | No recorded apply |
| Public objects | 0 | No silent DDL |
| Auth profile trigger | absent | Schema #1 never applied |
| Migrations schema | absent | No Supabase migration tracking yet |

**Conclusion:** No partial or full prior Nordlicht apply on handels. Safe to treat as greenfield.

**Review history note (do not copy to handels as-is):**

| Remote version | Name |
|----------------|------|
| `20261013114928` | `nordlicht_schema_v1` |
| `20261013115619` | `nordlicht_rls_v1` |
| `20261014071224` | `nordlicht_grants_v1` |
| `20261014071336` | `nordlicht_booking_rpcs_v1` |
| `20261014071604` | `nordlicht_booking_rpcs_v1_complete` *(chunked apply marker on review only)* |
| `20261014085142` | `nordlicht_payment_idempotency_v1` |
| `20261014094746` | `nordlicht_app_rpcs_v1` |

On handels, apply the **six local files once**. Do **not** invent a seventh `_complete` migration — local `…_booking_rpcs_v1.sql` already contains the complete bodies.

---

## 5. Risk per migration (empty vs non-empty prod)

| # | File | Empty handels (current) | If non-empty prod later |
|---|------|-------------------------|-------------------------|
| 1 | schema_v1 | **Low** — CREATE + seed templates; `ON DELETE CASCADE` only on FKs | **High** — `CREATE TABLE` fails if names exist; would need drift plan |
| 2 | rls_v1 | **Low** — policies/helpers | **Medium** — `CREATE POLICY` conflicts if partial RLS exists |
| 3 | grants_v1 | **Low** — REVOKE/GRANT | **Medium** — broad revoke can break unexpected clients mid-flight |
| 4 | booking_rpcs_v1 | **Low** — REPLACE functions; `DROP INDEX IF EXISTS`; revoke DML | **Medium** — drop one-booking index changes uniqueness; revoke breaks direct client writes (intended) |
| 5 | payment_idempotency_v1 | **Low** — `CREATE UNIQUE INDEX IF NOT EXISTS` on empty tables | **High if duplicates** — index build fails on colliding payment rows |
| 6 | app_rpcs_v1 | **Low** — new DEFINER RPCs | **Low–Medium** — REPLACE only; no table rewrite |

**Destructive / data-loss:** No `TRUNCATE`, no `DELETE FROM`, no `DROP TABLE` in the six files. Only `DROP INDEX IF EXISTS document_journal_links_one_booking_idx` (#4). Schema seed inserts into `account_templates` only.

---

## 6. Focus areas

### Org isolation
- All business tables scoped by `organization_id` + RLS `is_org_member` / `can_write_org`.
- Composite unique keys are org-scoped (numbers, SKUs, legacy ids).
- Review policies match this design.

### Roles
- `owner`, `teacher`, `student`, `viewer`.
- Writers: `owner` + `student` only (`can_write_org`).
- Teacher: member-admin for `student`/`viewer` invites only — cannot grant `owner`/`teacher`.

### Booking RPCs
- DEFINER + `can_write_org` + `FOR UPDATE` + `booked_at` guard.
- Multi-VAT: one-booking partial unique index dropped; Doppelbuchung via `booked_at` + RPC.

### Booked immutability
- Triggers: `enforce_invoice_booking_immutability`, line unlock guards, payment rules, journal balance.
- RLS blocks client UPDATE/DELETE when `booked_at IS NOT NULL`.

### Payment idempotency
- Natural key: `(organization_id, invoice_id, payment_date, amount_cents, bank_account, coalesce(reference,''))`.
- Present on review; missing on handels until #5.
- Teilzahlungen with distinct amount/date/bank/ref remain allowed.

---

## 7. Collision risk with existing prod data

| Object | handels now | Risk |
|--------|-------------|------|
| Unique document numbers / org slugs / SKUs | no rows | **none** |
| Payment natural-key indexes | no payment rows | **none** |
| `account_templates` PK seed | empty table after CREATE | **none** (insert of catalog) |
| `auth.users` ↔ `profiles` trigger | 0 users | **none** |
| Future import of external data before #5 | n/a | If data loaded between #4 and #5 with duplicate natural keys, #5 **fails** — abort and clean |

**Unknowns:** none material for current empty state. Auth Site URL / email templates / custom roles outside these migrations were **not** audited as blockers for DDL freigabe.

---

## 8. Post-freigabe apply procedure (reproducible)

**Do not run until Miguel explicitly freigibt handels apply.**

### Preflight (every session)

1. Confirm refs aloud:
   - **Target:** `nordlicht-handels` = `kicwytgtrdadrhhlfrnn`
   - **Never:** TrueFuel `ipblsxncnwyizdxudtrc`
   - Review `tbxdoapspjhabcsxgllx` is comparison only
2. `get_project` → name/ref/status must match handels.
3. `list_migrations` → expect `[]` (or exactly the prefix already applied if resuming — see abort rules).
4. Catalog SELECT: expect 0 public tables **before #1**. If any Nordlicht table/function exists without history → **ABORT** (drift).
5. Confirm git tip contains the six files + SHA-256s above (or re-hash and record).

### Apply (one migration at a time)

For each file `#1` → `#6`:

1. Re-verify `project_id == kicwytgtrdadrhhlfrnn`.
2. `apply_migration` with **snake_case name** derived from file (e.g. `nordlicht_schema_v1`) and **exact file SQL**.
3. Immediately verify:
   - `list_migrations` gained exactly one new entry for that step
   - Object checks for that step (below)
4. On any unexpected error or drift → **ABORT**. Do not continue to the next file. Do not “fix forward” without a written recovery plan.

### Per-step verify

| After | Must see |
|-------|----------|
| #1 | 26 public tables; `account_templates` seeded (~24); `on_auth_user_created` on `auth.users`; `create_organization` exists |
| #2 | RLS enabled on all 26; helpers exist; policy count ≫ 0 (review reference: 81 policies in SQL) |
| #3 | `anon` table grants = 0; `authenticated` has SELECT on business tables |
| #4 | five booking RPCs DEFINER; `one_booking_idx` absent; `authenticated` INSERT/UPDATE/DELETE revoked on journal/payments/stock/links |
| #5 | both `*_natural_key_uidx` present |
| #6 | `record_goods_receipt` + `import_workspace` DEFINER; EXECUTE for `authenticated`, not `anon` |

### Final verify

- `list_migrations` length **6** (names for the six intents; versions assigned by platform).
- Optional: re-run review-style catalog/grant queries on handels; compare to §3 review baseline.
- Optional smoke (Auth user + org + book/pay) — **separate** approval; not part of this check.
- Point production frontend at handels **only after** schema verify + Auth URL config — separate freigabe.

### Abort conditions

- Wrong project ref/name
- Non-empty public schema before #1
- History/object mismatch vs step expectations
- Unique-index build failure (#5)
- Any write targeting TrueFuel or review accidentally

---

## 9. Local static checks (this run)

| Command | Result |
|---------|--------|
| Migration file presence / order | **6/6** on tip `3fa66fa` |
| SHA-256 recorded | yes (§1) |
| `npm ci` | OK |
| `npm test` | **69/69** passed (20 files) |
| `npm run typecheck` | **pass** |
| `npm run lint` | **pass** (pre-existing react warnings only; no errors) |
| Remote apply | **not run** (by design) |
| handels `list_migrations` after check | still `[]` (untouched) |

---

## 10. Recommendation + next user action

**Recommendation:** Approve handels **migration apply freigabe** for the six files in §1 on empty `kicwytgtrdadrhhlfrnn`, using the procedure in §8. Keep Preview on review until a separate production frontend freigabe.

**Exact next user action:** Reply with explicit approval, e.g.  
`Freigabe: apply the six Nordlicht migrations to nordlicht-handels (kicwytgtrdadrhhlfrnn) only.`  
Until then: **no** `apply_migration`, **no** production Pages cutover.

---

## 11. Safety confirmation

- **handels** (`kicwytgtrdadrhhlfrnn`): READ-ONLY this check — `get_project`, `list_migrations`, `list_tables`, SELECT catalog SQL, `get_advisors`, `get_project_url` only. **No** `apply_migration`, **no** writing SQL, **no** config/data/user changes.
- **TrueFuel** (`ipblsxncnwyizdxudtrc`): untouched.
- **Review** (`tbxdoapspjhabcsxgllx`): read-only comparison only.
- **No** production deploy.
