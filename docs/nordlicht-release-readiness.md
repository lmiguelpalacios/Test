# Nordlicht Handels GmbH — Release readiness (Production cutover)

**Stand:** 2026-10-21  
**Branch / PR:** `cursor/supabase-app-integration-2188` @ `f78e0e4` — [PR #3](https://github.com/lmiguelpalacios/Test/pull/3) (draft)  
**Scope:** Cloudflare Pages **Production** → `nordlicht-handels`; **Preview** stays on review  
**Freigabe:** Explicit — switch Production to handels after migrations 6/6

---

## Verdict

| Area | Status |
|------|--------|
| Local demo (no env) | **Works** — Workspace v4 localStorage |
| Supabase / online mode | **Works** — AuthGate, org, RPC book/pay/WE, draft persist wired |
| `npm test` | **69/69** passed (pre-deploy on `f78e0e4`) |
| `npm run typecheck` | **OK** |
| `npm run build` (handels bake) | **OK** — bundle ref `kicwytgtrdadrhhlfrnn` only |
| Cloudflare Pages Production | **Live** → handels (`kicwytgtrdadrhhlfrnn`) |
| Cloudflare Pages Preview alias | **Still review** (`tbxdoapspjhabcsxgllx`) |
| handels (`kicwytgtrdadrhhlfrnn`) | **ACTIVE_HEALTHY** — migrations **6/6**; 26 public tables |
| TrueFuel (`ipblsxncnwyizdxudtrc`) | **Untouched** |
| Review (`tbxdoapspjhabcsxgllx`) | **Untouched** (schema/data); Preview continues to read it |

---

## Verified live URLs (2026-10-21)

| Item | Value |
|------|--------|
| Pages project | `nordlicht-preview` (only Pages project in account; no foreign projects touched) |
| Production URL | https://nordlicht-preview.pages.dev |
| Production deploy id | `a7b308ba-3176-4ede-9d3f-111fe865ff58` |
| Deploy URL | https://a7b308ba.nordlicht-preview.pages.dev |
| Production backend (baked JS) | `https://kicwytgtrdadrhhlfrnn.supabase.co` + **anon** JWT (`role=anon`, `ref=kicwytgtrdadrhhlfrnn`) |
| Preview alias | https://preview.nordlicht-preview.pages.dev |
| Preview backend (baked JS) | `https://tbxdoapspjhabcsxgllx.supabase.co` + **anon** (`ref=tbxdoapspjhabcsxgllx`) |
| Reachability | **HTTP 200** `/`, SPA `/buchhaltung`, `/verkauf`, `/einkauf`, JS/CSS |
| Custom domain / DNS | **None** (`*.pages.dev` only) |
| `service_role` in bundle | **None** (Production + Preview) |
| Signup redirect (app) | `emailRedirectTo: ${window.location.origin}/` present in live bundles |

Vite inlines `VITE_SUPABASE_*` at **build** time. Production deploy was **direct upload** of `dist` built with handels URL + anon. Pages project env vars updated for future Git builds (see below).

---

## Cloudflare env split (verified via API)

| Environment | `VITE_SUPABASE_URL` | Anon key | `VITE_APP_LABEL` |
|-------------|---------------------|----------|------------------|
| **production** | handels `kicwytgtrdadrhhlfrnn` | handels anon | `Production — nordlicht-handels` |
| **preview** | review `tbxdoapspjhabcsxgllx` | review anon | `Preview/Test — Review Backend` |

No shared wrong fallback: Production and Preview env vars are set independently.

---

## Auth URL config (handels) — Dashboard still required

Management API `GET/PATCH …/config/auth` returned **401** (no `SUPABASE_ACCESS_TOKEN`). Supabase MCP has no Auth-config tool. Public GoTrue `/auth/v1/settings` is reachable (`disable_signup=false`, email external enabled); Site URL is **not** exposed there.

**Miguel — Dashboard (`nordlicht-handels` / `kicwytgtrdadrhhlfrnn` only):**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → **nordlicht-handels** (`kicwytgtrdadrhhlfrnn`).
2. **Authentication** → **URL Configuration**.
3. Set **Site URL** to `https://nordlicht-preview.pages.dev`.
4. **Redirect URLs** (tight):
   - `https://nordlicht-preview.pages.dev/**`
   - `https://a7b308ba.nordlicht-preview.pages.dev/**` (optional; this deploy host)
5. Save. Do **not** change TrueFuel. Keep review Auth URLs only if still needed for Preview tests (`https://preview.nordlicht-preview.pages.dev/**` on **review** project).

**Management API** (with personal access token):  
`PATCH https://api.supabase.com/v1/projects/kicwytgtrdadrhhlfrnn/config/auth`  
`{"site_url":"https://nordlicht-preview.pages.dev","uri_allow_list":"https://nordlicht-preview.pages.dev/**"}`

Pages Production switch completed **without** waiting on Auth Dashboard (as required). Confirmation emails may still hit localhost until Site URL is set.

---

## Honest v1 disables (supabase / Production)

| Feature | Status |
|---------|--------|
| Manual journal entry | **Disabled** (`manualJournal: false`) |
| Learning → journal practice | **Disabled** (`learningPracticeJournal: false`; stub RPC) |
| Demo reset | **Disabled** (`resetDemo: false`) |
| Book / pay / WE | **Enabled** via DEFINER RPCs |
| Draft create / PO confirm | **Enabled** |
| Workspace import wizard | **Enabled** |

Smoke did **not** create bookings, payments, stock movements, or synthetic production users.

---

## handels migrations (reference)

Applied 2026-10-21 — see `docs/nordlicht-production-migration-check.md`. Remote history names: `nordlicht_schema_v1` … `nordlicht_app_rpcs_v1` (6/6). Re-verified this pass: `list_migrations` length 6; 26 public tables.

---

## Test scores (this cutover)

| Command | Result |
|---------|--------|
| `npm test` | **69/69** |
| `npm run typecheck` | pass |
| `npm run build` (handels env) | pass; JS contains handels ref only |
| Live Production HTTP | **200** + handels anon bake |
| Live Preview alias HTTP | **200** + review anon bake |

---

## Remaining risks / follow-ups

1. **Auth Site URL on handels** — complete Dashboard steps above (blocked without Management API token).
2. Auth Site URL on **review** (for Preview confirmation emails) — still recommended if not done.
3. `post_learning_practice` — keep disabled until implemented.
4. No fake production bookings/users created; first real Auth user is operator action.
5. Optional: GitHub-connected Pages builds (source still `null` / direct upload).
6. Classroom invite flow still thin (Owner create / pre-provision membership).

---

## Safety confirmation (2026-10-21)

- **handels** (`kicwytgtrdadrhhlfrnn`): Production frontend + anon only; Auth Site URL Dashboard pending; no destructive SQL this pass.
- **Review** (`tbxdoapspjhabcsxgllx`): **no schema/data writes**; Preview alias still points at review-baked deploy.
- **TrueFuel** (`ipblsxncnwyizdxudtrc`): **untouched**.
- **No** `service_role` in git, Pages env values used for frontend, or live JS bundles.
- Only Cloudflare Pages project modified: `nordlicht-preview`.
