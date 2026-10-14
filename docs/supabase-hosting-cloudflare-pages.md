# Hosting prep — Cloudflare Pages (no deploy in this phase)

**Stand:** 2026-10-14  
**Scope:** Build/env/runbook documentation only. **Do not** create new production Cloudflare/Supabase resources from this doc alone.

---

## Build

| Setting | Value |
|---------|--------|
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node | 20+ recommended |
| SPA | Yes — all routes → `index.html` |

### SPA redirects (`public/_redirects` or Pages rule)

```
/*    /index.html   200
```

Already sufficient if using Cloudflare Pages “SPA” checkbox / `functions` not required for static Vite.

---

## Environment variables (Pages → Settings → Environment variables)

| Name | Required | Notes |
|------|----------|--------|
| `VITE_SUPABASE_URL` | for online mode | Project URL (`https://<ref>.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | for online mode | **anon / publishable** key only |
| `VITE_DATA_BACKEND` | optional | `local` forces demo; `supabase` requires URL+anon |

**Never** set `service_role` in Pages or any frontend env.  
Missing/invalid URL+anon → app stays in **local demo mode** (Workspace v4 localStorage).

Preview vs Production: use the **review** Supabase project for Preview; do **not** point production at `nordlicht-handels` until explicitly approved.

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
| Valid URL + anon | Supabase mode; AuthGate → org → RPC/table adapter |
| `VITE_DATA_BACKEND=local` with keys present | Force local demo (no hybrid writes) |

---

## What this phase does **not** do

- No Cloudflare Pages project creation / deploy requiring new external resources
- No handels (`kicwytgtrdadrhhlfrnn`) or TrueFuel (`ipblsxncnwyizdxudtrc`) changes
- No service_role in git or browser
