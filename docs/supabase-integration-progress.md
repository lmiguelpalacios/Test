# Supabase integration progress — Nordlicht (local-safe phase)

**Stand:** 2026-10-14  
**Branch:** `cursor/supabase-app-integration-2188` (from PR #2 tip)  
**Mode:** dual-mode app + new app RPCs in repo; **no** handels/TrueFuel changes

---

## Verdict

| Area | Status |
|------|--------|
| Local demo (no env) | **Works** — Workspace v4 localStorage unchanged |
| Supabase mode (URL + anon) | **Implemented** — AuthGate, org context, adapter, RPC book/pay/WE, import wizard |
| `npm test` | **69/69** passed |
| `npm run typecheck` | **OK** |
| `npm run build` | run in CI/this agent after commit |
| Remote apply of `app_rpcs_v1` | **Blocked** — MCP account currently lists only TrueFuel (`ipblsxncnwyizdxudtrc`); review/handels not visible → no remote SQL |
| handels / TrueFuel | **Untouched** (identity policy; no apply/pause/delete) |

---

## Implemented (Phases A–G)

### A — DB consistency

- Verified PR #2 tip vs PR #1 frontend: grants, booking RPCs, payment idempotency migrations + harness present; schema/RLS not rewritten.
- New migration only: `20261014120000_nordlicht_app_rpcs_v1.sql` (`record_goods_receipt`, `import_workspace`).
- Local Vitest green; local SQL harness not re-run here (no `psql` in this environment).

### B — Dual-mode foundation

| Piece | Location |
|-------|----------|
| Env detect | `src/supabase/env.ts`, `.env.example` |
| Client (anon only) | `src/supabase/client.ts` + `@supabase/supabase-js` |
| Auth | `src/auth/AuthContext.tsx`, `src/components/auth/AuthGate.tsx` |
| Org | `src/auth/OrgContext.tsx` |
| Adapter seam | `src/persistence/*`, `DataBackendContext` |
| Mode badge | `src/components/ModeBadge.tsx` (Sidebar/Topbar/Einstellungen) |

No silent hybrid: supabase mode does **not** write the journal to localStorage; local mode does not call RPCs.

### C — Module wiring

| Module | Local | Supabase |
|--------|-------|----------|
| Auth / org | n/a (demo) | login/signup, create_organization, active org |
| Journal read / reports | localStorage | SELECT via RLS |
| Manual journal entry | yes | **blocked** (capability) |
| Sales master + drafts | yes | PostgREST upsert |
| Sales book / pay | client | `book_sales_invoice` / `record_sales_payment` |
| Purchase master / PO | yes | PostgREST |
| Vendor book / pay | client | RPCs |
| Goods receipt | client | `record_goods_receipt` RPC |
| Learning evaluate / progress | yes | progress upsert; practice journal **blocked** |
| Demo reset | yes | blocked |

### D — Workspace-v4 import

- UI: `WorkspaceImportWizard` on Einstellungen — preview → confirm → hash idempotent RPC.
- No auto-import on login; localStorage not cleared after success.

### E — Tests

- Existing localStorage suite kept.
- New: `env.test.ts`, `workspaceHash.test.ts`, `localWorkspaceRepository.test.ts`.
- **69/69** Vitest; typecheck OK.

### F — Hosting prep

- `docs/supabase-hosting-cloudflare-pages.md`
- `public/_redirects` SPA fallback
- **No** Pages deploy / new prod resources

### G — This document

- Repo: `docs/supabase-integration-progress.md`
- Store mirror: same path under Project Agent Store `docs/`

---

## How to run

```bash
# Demo (default)
npm install && npm run dev

# Online (review project only — never handels)
cp .env.example .env.local
# set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (anon only)
npm run dev
```

---

## Remaining online steps (not this phase)

1. Restore MCP/access to review project `tbxdoapspjhabcsxgllx` and apply `nordlicht_app_rpcs_v1` after identity verify.
2. Implement `post_learning_practice` RPC; enable capability.
3. Draft-save paths: make invoice/PO/vendor saves fully async + await errors in UI.
4. Cloudflare Pages deploy only with approved env pointing at review (not handels).
5. Productive handels freigabe remains **out of scope**.

---

## Safety confirmations

- `nordlicht-handels` (`kicwytgtrdadrhhlfrnn`): **not modified**
- TrueFuel (`ipblsxncnwyizdxudtrc`): **not activated/changed/deleted**
- No `service_role` in frontend/git
- Applied migrations not rewritten; fixes = new migration files only
