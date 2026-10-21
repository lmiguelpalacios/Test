# Nordlicht — Production migration check (`nordlicht-handels`)

**Stand:** 2026-10-21  
**Latest action:** APPLY — **6/6 succeeded** on production handels  
**Repo tip:** `cursor/supabase-app-integration-2188` (PR #3)  
**Production:** `nordlicht-handels` / `kicwytgtrdadrhhlfrnn`  
**Review (comparison):** `nordlicht-security-review` / `tbxdoapspjhabcsxgllx` — **untouched**  
**TrueFuel:** `ipblsxncnwyizdxudtrc` — **untouched** (no writes; not in Nordlicht MCP org session)

---

## Apply attempt verdict (2026-10-21)

**All six migrations applied successfully** to `nordlicht-handels` only. No chunked booking apply (no `_complete` marker).

| Gate | Result |
|------|--------|
| Explicit freigabe | **Yes** — apply six migrations to handels only |
| Local files + SHA-256 vs §1 | **PASS** — all six match recorded checksums |
| MCP `list_organizations` | Nordlicht (`iwolvmzjskpgzuiddewn`) visible |
| MCP `get_project` `kicwytgtrdadrhhlfrnn` | **PASS** — `nordlicht-handels` / `ACTIVE_HEALTHY` / org `iwolvmzjskpgzuiddewn` |
| Preflight `list_migrations` | `[]` |
| Preflight catalog | 0 tables / functions / policies / triggers / indexes; 0 auth users |
| Unexpected drift | **None** |
| Cloudflare / DNS / app / seed / test accounts | **No** |
| TrueFuel / review writes | **No** |

**Clear statement:** **6/6 succeeded.**

### Per-migration results (this attempt)

| # | Filename | History name | Remote version | Result | Verified objects |
|---|----------|--------------|----------------|--------|------------------|
| 1 | `20261012120000_nordlicht_schema_v1.sql` | `nordlicht_schema_v1` | `20261021080614` | **OK** | 26 tables; 24 `account_templates`; 12 `learning_tasks`; `on_auth_user_created`; `create_organization` |
| 2 | `20261012120100_nordlicht_rls_v1.sql` | `nordlicht_rls_v1` | `20261021080736` | **OK** | RLS on 26/26; 81 policies; 4 helpers (`is_org_member`, `org_member_role`, `has_org_role`, `can_write_org`) |
| 3 | `20261013140000_nordlicht_grants_v1.sql` | `nordlicht_grants_v1` | `20261021080805` | **OK** | `anon` table grants = 0; `authenticated` SELECT on 26 tables |
| 4 | `20261013140100_nordlicht_booking_rpcs_v1.sql` | `nordlicht_booking_rpcs_v1` | `20261021080947` | **OK** (single shot; no `_complete`) | 5 booking RPCs DEFINER; `one_booking_idx` absent; journal/payment/stock/links INSERT/UPDATE/DELETE revoked from `authenticated` |
| 5 | `20261014100000_nordlicht_payment_idempotency_v1.sql` | `nordlicht_payment_idempotency_v1` | `20261021081004` | **OK** | `sales_payments_natural_key_uidx` + `vendor_payments_natural_key_uidx` |
| 6 | `20261014120000_nordlicht_app_rpcs_v1.sql` | `nordlicht_app_rpcs_v1` | `20261021081124` | **OK** | `record_goods_receipt` + `import_workspace` DEFINER; EXECUTE `authenticated` yes / `anon` no |

### Security checks (post-apply)

| Check | Result |
|-------|--------|
| History length / names | **6/6** intents present (platform versions above) |
| RLS enabled | **26/26** |
| Policy count | **81** |
| `anon` table grants | **0** |
| DEFINER + `search_path=public` | booking (5) + app (2) + helpers checked — **all** |
| EXECUTE `authenticated` / not `anon` | booking + app RPCs — **pass** |
| Journal/payment/stock/links client DML | **revoked** (0 INSERT/UPDATE/DELETE for `authenticated`) |
| Payment natural-key uidx | **2/2** |
| `document_journal_links_one_booking_idx` | **absent** (correct) |
| Business / customer data | **none** (`organizations` 0, `customers` 0, `auth.users` 0); catalog seeds only (`account_templates` 24, `learning_tasks` 12) |

### Remaining issues

1. Production frontend cutover / Auth Site URL on handels — **out of scope** (separate freigabe).
2. Optional smoke (Auth user + org + book/pay) — **not run**; no test business data created.

---

## Prior apply attempt (2026-10-20) — aborted

**0/6** — MCP session saw only TrueFuel org; `get_project` handels permission denied. No writes.

---

## Prior check verdict (2026-10-15, READ-ONLY)

**freigabefähig** — empty handels DB verified then; six local migrations in order after explicit freigabe.

| Gate | Result |
|------|--------|
| handels `list_migrations` | `[]` |
| handels public tables / functions / policies / triggers / indexes | **0 / 0 / 0 / 0 / 0** |
| Destructive risk on empty prod | **Low** |

---

## 1. Six migrations — filenames, order, dependencies

Source of truth: `supabase/migrations/` on branch `cursor/supabase-app-integration-2188`.

| # | Exact filename | SHA-256 | Depends on | Intent |
|---|---------------|---------|------------|--------|
| 1 | `20261012120000_nordlicht_schema_v1.sql` | `6cbfe575e350c53fb3d7ec35ac77a7111d3f1bdd0d101f2e3c8a96f2ec661334` | empty `public` (+ platform `pgcrypto` OK) | 26 tables, triggers, seed `account_templates`, `create_organization` / seed helpers |
| 2 | `20261012120100_nordlicht_rls_v1.sql` | `1413699f0a8857e20892de272b6c6c0d626f3876b931e5484e08881c23a41110` | #1 | Org helpers + FORCE RLS + policies (81 `create policy`) |
| 3 | `20261013140000_nordlicht_grants_v1.sql` | `3440b38ecfdc821ff96d41eacb490eed2d3f07aa3e6786f2cb45e28a2b24c9a8` | #1+#2 | `anon` revoke; `authenticated` least-privilege table/function grants |
| 4 | `20261013140100_nordlicht_booking_rpcs_v1.sql` | `c17d958faf893c5175398c46a5d696392fc92777459af7caf57ac64189203f0c` | #1–#3 | Booking/payment RPCs; drop one-booking index; revoke journal/payment/stock client DML |
| 5 | `20261014100000_nordlicht_payment_idempotency_v1.sql` | `0f3640303eae12c24c71590533e68c490f50a54876aa60891e704407afea5bf3` | #1+#4 | Unique natural-key indexes on `sales_payments` / `vendor_payments` |
| 6 | `20261014120000_nordlicht_app_rpcs_v1.sql` | `a6aa6c6f58347cabdf100a01a41ed25c8a078ecb5218b1a4de5b54e771d178c8` | #1–#4 (`next_document_number`, `can_write_org`) | `record_goods_receipt`, `import_workspace` |

**Apply order is strict.** Local filenames are the apply source (remote versions are platform-assigned).

**2026-10-21 re-hash:** all six SHA-256 values above **confirmed identical** before apply.

---

## 2. handels — migration history + schema state (POST-APPLY, 2026-10-21)

**Identity (MCP `get_project`):**

| Field | Value |
|-------|-------|
| name | `nordlicht-handels` |
| ref / id | `kicwytgtrdadrhhlfrnn` |
| status | `ACTIVE_HEALTHY` |
| region | `eu-central-1` |
| Postgres | 17.11 |
| Organisation | Nordlicht (`iwolvmzjskpgzuiddewn`) |

**History:** 6 entries (see per-migration table above).

**Catalog (post-apply):**

| Metric | Value |
|--------|-------|
| `public` tables | 26 |
| RLS enabled | 26 |
| `public` policies | 81 |
| Payment natural-key indexes | 2 |
| Booking + app DEFINER RPCs | 7 |
| `anon` table grants | 0 |
| `auth.users` | 0 |
| Business orgs / customers | 0 / 0 |

---

## 3. Compare expected vs handels vs review

### handels today vs expected

| Area | Expected | handels (2026-10-21) | Gap |
|------|----------|----------------------|-----|
| Tables | 26 | 26 | **closed** |
| RLS / policies | enabled + policies | 26 RLS / 81 policies | **closed** |
| Grants | least privilege | anon 0; protected DML revoked | **closed** |
| Booking RPCs | 5 | 5 DEFINER | **closed** |
| Payment unique indexes | 2 | 2 | **closed** |
| App RPCs | 2 | 2 DEFINER | **closed** |

### review note

Review remains comparison-only; **no writes** this session. Review history may still include a `_complete` chunk marker from an earlier chunked apply — handels does **not** (single-shot #4).

---

## 4. Partial / full prior apply detection (preflight 2026-10-21)

| Signal | handels preflight | Interpretation |
|--------|-------------------|----------------|
| Migration history count | 0 | No recorded apply |
| Public objects | 0 | No silent DDL |
| Auth profile trigger | absent | Schema #1 never applied |

**Conclusion:** Greenfield apply was safe; completed 6/6.

---

## 5–7. Risk / focus / collision

Unchanged from prior empty-prod analysis. No customer data present before or after apply (catalog seeds only).

---

## 8. Post-freigabe apply procedure

Completed 2026-10-21 per this document. Do **not** re-apply the six files unless resetting the project.

### Abort conditions (still valid for future work)

- Wrong project ref/name
- MCP session lacks Nordlicht org / handels access
- History/object mismatch vs step expectations
- Any write targeting TrueFuel or review accidentally

---

## 9. Local static checks

| Command | Result |
|---------|--------|
| Migration file presence / order | **6/6** |
| SHA-256 (2026-10-21) | **match §1** |
| Remote apply (2026-10-21) | **6/6 OK** on `kicwytgtrdadrhhlfrnn` |
| TrueFuel / review writes | **none** |

---

## 10. Recommendation + next user action

**Recommendation:** Schema on handels is production-ready for Auth URL config + frontend cutover (separate freigabe). Optional: Auth smoke with a non-customer test user.

**Exact next user action:** Approve Auth Site URL / production Pages pointing at handels when ready — not part of this apply.

---

## 11. Safety confirmation (2026-10-21 apply)

- **handels** (`kicwytgtrdadrhhlfrnn`): **six migrations applied** + verified.
- **TrueFuel** (`ipblsxncnwyizdxudtrc`): **untouched** (no SQL / migration; `get_project` not permitted in this Nordlicht-only session).
- **Review** (`tbxdoapspjhabcsxgllx`): **untouched** (listed only; no `apply_migration` / `execute_sql` writes).
- **No** production deploy, Cloudflare/DNS, customer seed data, or test accounts.
