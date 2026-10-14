# Hosting — Cloudflare Pages (Preview/Test deployed)

**Stand:** 2026-10-14  
**Scope:** Vite SPA on Cloudflare Pages. Preview/Test points at **review** Supabase — never claim Production/handels until freigabe.

---

## Live Preview/Test

| Setting | Value |
|---------|--------|
| Project | `nordlicht-preview` |
| URL | https://nordlicht-preview.pages.dev |
| Also | https://preview.nordlicht-preview.pages.dev |
| Backend | `tbxdoapspjhabcsxgllx` (nordlicht-security-review) URL + **anon** |
| Domain | `*.pages.dev` only (no custom DNS) |
| Tier | Free / standard — no paid addons |

See `docs/nordlicht-release-readiness.md` for verification evidence.

---

## Build

| Setting | Value |
|---------|--------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node | 20+ recommended |
| SPA | Yes — `public/_redirects`: `/*    /index.html   200` |

Vite inlines `VITE_*` at **build** time. For direct upload, build with review env locally; for Git builds, set the same vars in Pages project env (already configured on `nordlicht-preview`).

---

## Environment variables (Pages)

| Name | Required | Notes |
|------|----------|--------|
| `VITE_SUPABASE_URL` | for online mode | Review: `https://tbxdoapspjhabcsxgllx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | for online mode | **anon / publishable** only |
| `VITE_DATA_BACKEND` | optional | `supabase` for Preview; `local` forces demo |
| `VITE_APP_LABEL` | optional | `Preview/Test — Review Backend` |

**Never** set `service_role`.  
Do **not** point this Preview project at `nordlicht-handels` until migrations + explicit freigabe.

---

## Local runbook

```bash
cp .env.example .env.local   # fill URL + anon, or omit for demo
npm install
npm run dev                  # http://localhost:5173
npm test
npm run typecheck
npm run build && npm run preview
```

### Mode matrix

| Env | Behavior |
|-----|----------|
| No `VITE_SUPABASE_*` | Local demo; full Workspace v4; no AuthGate |
| Valid URL + anon | Supabase / Preview mode; AuthGate → org → RPC/table adapter |
| `VITE_DATA_BACKEND=local` with keys present | Force local demo (no hybrid writes) |

---

## Deploy notes

- This pass: **direct upload** of `dist` after `npm run build` with review env.
- GitHub continuous builds preferred once CF↔GitHub is connected on this account.
- No foreign sites/domains modified.
