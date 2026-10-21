# Nordlicht Handels GmbH — Release readiness (Production cutover)

**Stand:** 2026-10-21 (Auth login/signup follow-up)  
**Branch / PR:** `cursor/supabase-app-integration-2188` @ `1005891` — [PR #3](https://github.com/lmiguelpalacios/Test/pull/3) (draft)  
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
| Auth Site URL (handels) | **Still localhost default** — Dashboard/PAT required (see below) |

---

## Urgent: login / signup (2026-10-21 evening)

### What was checked (safe only)

| Check | Result |
|-------|--------|
| Set Auth Site URL via Supabase MCP | **Impossible** — no Auth-config tool |
| Management API `GET/PATCH …/config/auth` | **401** — `SUPABASE_ACCESS_TOKEN` unset |
| `supabase config push --project-ref kicwytgtrdadrhhlfrnn` | **AccessTokenRequiredError** (same) |
| Cloudflare API / Pages | Can deploy frontend only — **cannot** set Supabase Auth URLs |
| TrueFuel / review schema | **Not touched** |
| Production frontend `emailRedirectTo` | **Correct** in source + live bundle `a7b308ba`: `` `${window.location.origin}/` `` |
| Production bake | handels ref only; `localhost` hits are gotrue-js library defaults, not app redirects |
| Redeploy | **Not needed** for redirect code (already shipped) |

### Why existing login fails on Production

Production (`https://nordlicht-preview.pages.dev`) talks to **handels** Auth. Preview alias talks to **review** Auth. Those are separate `auth.users` databases.

| Project | `auth.users` | confirmed | orgs | memberships | note |
|---------|--------------|-----------|------|-------------|------|
| **handels** `kicwytgtrdadrhhlfrnn` | 1 | 1 | **0** | **0** | User created ~2026-10-21 22:26 UTC (same email fingerprint as review; **different** user id) |
| **review** `tbxdoapspjhabcsxgllx` | 1 | 1 | 1 | 1 | Older account (~2026-10-15); last sign-in earlier same day |

**Conclusion:** The “existing account” from Preview/review **does not** authenticate against handels. Re-signup (or a fresh password) on **Production → handels** is required. Review org/data does not migrate automatically. After handels signup, create the Übungsunternehmen again (handels currently has **0** orgs).

GoTrue: `disable_signup=false`, `mailer_autoconfirm=false` — confirmation email is required. If the confirmation link opens **localhost**, GoTrue likely verified the token then redirected to Site URL fallback because allow-list / Site URL still default to localhost.

### Miguel — exact Dashboard clicks (handels only)

Site URL **cannot** be fixed from this agent without a Supabase personal access token. Do this once:

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **nordlicht-handels** (`kicwytgtrdadrhhlfrnn`).  
   Do **not** open TrueFuel. Review is separate (Preview only).
2. Left nav: **Authentication** → **URL Configuration**.
3. **Site URL** → set exactly:  
   `https://nordlicht-preview.pages.dev`
4. **Redirect URLs** → add (one per line / “Add URL”):  
   - `https://nordlicht-preview.pages.dev/**`  
   - `https://a7b308ba.nordlicht-preview.pages.dev/**` (optional; current deploy host)
5. **Save**.
6. On Production, **sign in** with the handels password if the account is already confirmed, **or** use Dashboard → Authentication → Users → resend confirmation / confirm manually, **or** sign up again only if no handels user exists yet.
7. Stale emails that already point at localhost stay wrong — request a **new** confirmation after step 5.

**Optional API path** (Miguel’s PAT, never commit the token):

```bash
export SUPABASE_ACCESS_TOKEN='sbp_…'   # Account → Access Tokens
curl -sS -X PATCH \
  'https://api.supabase.com/v1/projects/kicwytgtrdadrhhlfrnn/config/auth' \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"site_url":"https://nordlicht-preview.pages.dev","uri_allow_list":"https://nordlicht-preview.pages.dev/**,https://a7b308ba.nordlicht-preview.pages.dev/**"}'
```

Or CLI (same token): set `site_url` / `additional_redirect_urls` in `supabase/config.toml`, then  
`supabase config push --project-ref kicwytgtrdadrhhlfrnn`.

**Review** (only if Preview confirmation emails still hit localhost): same URL steps on `tbxdoapspjhabcsxgllx`, allow-list `https://preview.nordlicht-preview.pages.dev/**` as well.

### Smoke after Site URL is fixed

1. From Production, signup or resend confirmation.  
2. Email link host must be `nordlicht-preview.pages.dev` (not `localhost`).  
3. Land on SPA → session detected (`detectSessionInUrl: true`).  
4. Do **not** create fake bookings / accounting rows for the test.

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

1. **Auth Site URL on handels** — Miguel Dashboard (or PAT + Management API / `config push`) — **blocking confirmation UX**.
2. Auth Site URL on **review** (Preview confirmation emails) — still recommended if not done.
3. handels has **no org/membership** yet for the existing Auth user — create Übungsunternehmen after login.
4. `post_learning_practice` — keep disabled until implemented.
5. Optional: GitHub-connected Pages builds (source still `null` / direct upload).
6. Classroom invite flow still thin (Owner create / pre-provision membership).

---

## Safety confirmation (2026-10-21)

- **handels** (`kicwytgtrdadrhhlfrnn`): Production frontend + anon only; Auth Site URL still Dashboard-pending; read-only SQL counts on `auth.users` / org tables only; no destructive SQL.
- **Review** (`tbxdoapspjhabcsxgllx`): **no schema/data writes**; read-only user/org counts for diagnosis; Preview alias still points at review-baked deploy.
- **TrueFuel** (`ipblsxncnwyizdxudtrc`): **untouched**.
- **No** `service_role` in git, Pages env values used for frontend, or live JS bundles.
- Only Cloudflare Pages project previously modified for cutover: `nordlicht-preview` (no redeploy this Auth pass).
