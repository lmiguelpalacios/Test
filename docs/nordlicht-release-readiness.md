# Nordlicht Handels GmbH — Release readiness (Preview/Test)

**Stand:** 2026-10-15  
**Branch / PR:** `cursor/supabase-app-integration-2188` — [PR #3](https://github.com/lmiguelpalacios/Test/pull/3) (draft)  
**Scope:** Dual-mode app fixes + Cloudflare Pages **Preview/Test** against review backend  
**Not claimed:** Production / handels freigabe

---

## Verdict

| Area | Status |
|------|--------|
| Local demo (no env) | **Works** — Workspace v4 localStorage |
| Supabase / Preview mode | **Works** — AuthGate, org, RPC book/pay/WE, draft persist wired |
| `npm test` | **69/69** passed |
| `npm run typecheck` | **OK** |
| `npm run lint` | **OK** (pre-existing react warnings only) |
| `npm run build` | **OK** |
| Cloudflare Pages | **Deployed** — Preview/Test → review backend |
| handels (`kicwytgtrdadrhhlfrnn`) | **Untouched** — 0 public tables; **no migrations applied** |
| TrueFuel (`ipblsxncnwyizdxudtrc`) | **Untouched** (INACTIVE; no secrets used) |
| Review (`tbxdoapspjhabcsxgllx`) | **ACTIVE_HEALTHY** — all app migrations present |

---

## Verified preview URL

| Item | Value |
|------|-------|
| Pages project | `nordlicht-preview` (Cloudflare free / standard usage) |
| Canonical URL | https://nordlicht-preview.pages.dev |
| Production deploy id | `c5fa3bb5-ced1-42ee-8e30-dae57e0d150f` |
| Preview alias | https://preview.nordlicht-preview.pages.dev |
| Reachability | **HTTP 200** for `/`, SPA `/buchhaltung`, JS/CSS assets |
| Backend | **Review only** `https://tbxdoapspjhabcsxgllx.supabase.co` + **anon** key |
| Label | Preview/Test — **not** handels production |
| Custom domain / DNS | **None** (no Nordlicht zone in account; `*.pages.dev` only) |
| Paid addons | **None** |
| Signup redirect (app) | `signUp` passes `emailRedirectTo: ${window.location.origin}/` (verified in live bundle) |
| Auth Site URL (review) | **Still needs Dashboard/API update** — see below; without it confirmation links can still open localhost |

Build baked `VITE_SUPABASE_*` from review anon credentials at deploy time (Vite compile-time). Pages project env vars also set for future Git builds. Bundle contains review ref only; no `service_role`; no handels URL.

---

## What changed in this pass (app)

### Critical dual-mode fixes

- Wired `saveDraftInvoice` / `savePurchaseOrder` / `saveVendorInvoice` / `confirmPurchaseOrder` to Supabase repository (async + UUID ids/lines + reload).
- Wired learning progress via `saveLearningState` (no memory-only false success).
- `reloadFromBackend` surfaces load errors.
- Forms await async saves and show failures.

### Honest v1 disables (supabase / Preview)

| Feature | Status |
|---------|--------|
| Manual journal entry | Capability off + CTA hidden + `/buchhaltung/neu` redirects |
| Learning → journal practice | Capability off + button hidden (`post_learning_practice` stub) |
| Demo reset | Capability off + button hidden |
| Book / pay / WE | **Enabled** via DEFINER RPCs |
| Draft create / PO confirm | **Enabled** (now persisted) |
| Workspace import wizard | Enabled (explicit; no silent hybrid) |

### UX (student / classroom entry)

- AuthGate copy: Preview/Test + invite-or-create-org guidance.
- ModeBadge / Topbar: Preview labels + membership role.
- Sales / Einkauf / Buchhaltung banners branch on local vs online.

Stub file cleaned: only `post_learning_practice` remains; superseded WE/import stubs removed from `supabase/sql/rpc_booking_stubs.sql` to avoid accidental re-apply.

---

## Security / integrity (review)

| Check | Result |
|-------|--------|
| Project id verified | `nordlicht-security-review` / `tbxdoapspjhabcsxgllx` / `ACTIVE_HEALTHY` |
| Booking + app RPCs | DEFINER + `search_path=public` present |
| Grants | `authenticated` (+ `service_role`) EXECUTE; **not** PUBLIC/anon on checked RPCs |
| Payment natural-key indexes | `sales_payments_natural_key_uidx`, `vendor_payments_natural_key_uidx` present |
| Teilzahlung assumption | Natural key `(org, invoice, date, amount, bank, coalesce(reference,''))` — distinct Teilzahlungen allowed; identical retry collapses (client should set distinct `reference`) |
| Advisor WARN | Expected DEFINER-callable-by-authenticated for intentional app RPCs; helper `_nl_*` mutable search_path WARN (pre-existing) |
| Synthetic leftover | Payment tables empty at check time; prior smoke cleaned by earlier agent |
| handels SQL | Identity + empty public schema only — **no writes** |

---

## Migration gap — handels freigabe (chronological)

**handels today:** `list_migrations` → **[]**; `public` tables → **0**.  
**Do NOT apply until explicit user freigabe.**

Apply **in this order** from repo `supabase/migrations/` (filenames = local source of truth; remote history versions may differ as on review):

| # | Local migration file | Intent | On review? | On handels? |
|---|----------------------|--------|------------|-------------|
| 1 | `20261012120000_nordlicht_schema_v1.sql` | Schema v1 | yes (`nordlicht_schema_v1`) | **missing** |
| 2 | `20261012120100_nordlicht_rls_v1.sql` | RLS v1 | yes | **missing** |
| 3 | `20261013140000_nordlicht_grants_v1.sql` | Grants v1 | yes | **missing** |
| 4 | `20261013140100_nordlicht_booking_rpcs_v1.sql` | Booking RPCs (+ review had `…_complete` follow-up) | yes | **missing** |
| 5 | `20261014100000_nordlicht_payment_idempotency_v1.sql` | Payment natural-key unique indexes | yes | **missing** |
| 6 | `20261014120000_nordlicht_app_rpcs_v1.sql` | `record_goods_receipt`, `import_workspace` | yes | **missing** |

**Review history versions (reference only):**  
`20261013114928` schema → `…115619` rls → `…071224` grants → `…071336` booking_rpcs → `…071604` booking_rpcs_complete → `…085142` payment_idempotency → `…094746` app_rpcs.

**Not a production migration:** `post_learning_practice` remains stub; keep UI disabled until implemented.

---

## Test scores (honest)

| Command | Result |
|---------|--------|
| `npm test` | **69/69** |
| `npm run typecheck` | pass |
| `npm run lint` | pass (warnings only; no new errors) |
| `npm run build` | pass (`dist/`) |
| Remote app RPC smoke (prior) | **9/9** on review (import + WE); not re-run this pass |
| Payment idempotency remote (prior) | **22/22** on review |

---

## Cloudflare notes

- Account: personal CF account under Apple private-relay identity — clear ownership for Nordlicht Preview create.
- No existing foreign Pages/zones touched.
- Prefer GitHub integration later when CF↔GitHub OAuth is connected; this deploy used **direct upload** of `dist` after local `npm run build` with review env.
- Free tier / standard usage model only.

---

## Auth Site URL (review) — required for confirmation emails

App code now sends `emailRedirectTo` to the current origin, but Supabase Auth will still fall back to / reject against **Site URL** + **Redirect URLs** if those are still localhost.

**Miguel — Dashboard (review project `tbxdoapspjhabcsxgllx` only):**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **nordlicht-security-review** (`tbxdoapspjhabcsxgllx`).
2. **Authentication** → **URL Configuration**.
3. Set **Site URL** to `https://nordlicht-preview.pages.dev`.
4. Under **Redirect URLs** / Additional Redirect URLs, include at least:
   - `https://nordlicht-preview.pages.dev/**`
   - `https://preview.nordlicht-preview.pages.dev/**`
5. Save. Do **not** change `nordlicht-handels` or TrueFuel.

**Management API** (if you have a personal access token):  
`PATCH https://api.supabase.com/v1/projects/tbxdoapspjhabcsxgllx/config/auth` with  
`{"site_url":"https://nordlicht-preview.pages.dev","uri_allow_list":"https://nordlicht-preview.pages.dev/**,https://preview.nordlicht-preview.pages.dev/**"}`.

**Important:** Users who already received a confirmation email pointing at localhost need a **fresh signup or resend** after the Site URL change — old links stay broken.

Agent session could not update Auth config: Supabase MCP has no Auth-config tool, and no `SUPABASE_ACCESS_TOKEN` was available for Management API / `supabase config push`.

---

## Remaining risks / follow-ups

1. **Auth Site URL on review** — complete Dashboard steps above (blocked without Management API token).
2. **handels freigabe** — apply migrations 1–6 only after explicit approval; then point a *separate* Production Pages env at handels (never claim review = prod).
3. `post_learning_practice` implementation or keep disabled.
4. Master-data upserts still fire-and-forget (optimistic); improve await/rollback.
5. Classroom join/invite flow (no invite code yet — Owner create or pre-provision membership).
6. Optional: connect Pages GitHub source to PR branch for continuous preview builds.
7. Advisor cleanup for `_nl_*` helper `search_path` if desired.

---

## Next user-approval action

1. Open https://nordlicht-preview.pages.dev — register/login, create or join org, smoke book/pay/WE on **review**.  
2. When ready for production: **approve handels migration freigabe** (list above) — agent must not apply without it.  
3. Optionally approve GitHub-connected Pages builds and/or a distinct production project/env pointing at handels after migrations.

---

## Safety confirmation

- **handels** (`kicwytgtrdadrhhlfrnn`): read-only identity/status/URL/migration-list peek only — **untouched**.  
- **TrueFuel** (`ipblsxncnwyizdxudtrc`): untouched; secrets unused.  
- **No** `service_role` in git, Pages env, or frontend bundle.  
- Preview labeled as Preview/Test against review — **not** production.
