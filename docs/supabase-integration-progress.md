# Supabase integration progress — Nordlicht (local-safe phase)

**Stand:** 2026-10-14  
**Branch:** `cursor/supabase-app-integration-2188` (PR #3 draft)  
**Mode:** dual-mode app + new app RPCs in repo; **no** handels/TrueFuel changes  
**Kanonisch im Repo:** `docs/supabase-integration-progress.md`

---

## Verdict

| Area | Status |
|------|--------|
| Local demo (no env) | **Works** — Workspace v4 localStorage unchanged |
| Supabase mode (URL + anon) | **Implemented** — AuthGate, org context, adapter, RPC book/pay/WE, import wizard |
| `npm test` | **69/69** passed |
| `npm run typecheck` | **OK** |
| `npm run build` | **OK** (prior agent) |
| Remote apply of `app_rpcs_v1` | **Done** — applied on review `tbxdoapspjhabcsxgllx` only (`nordlicht_app_rpcs_v1`, history `20261014094746`); smoke **9/9 PASS** |
| handels / TrueFuel | **Untouched** (identity-only peek; no SQL/migrations/pause/delete) |

---

## Implemented (Phases A–G)

### A — DB consistency

- Verified PR #2 tip vs PR #1 frontend: grants, booking RPCs, payment idempotency migrations + harness present; schema/RLS not rewritten.
- New migration only: `20261014120000_nordlicht_app_rpcs_v1.sql` (`record_goods_receipt`, `import_workspace`).
- Local Vitest green; local SQL harness not re-run (no `psql` in agent environment).
- **Remote (review only):** `apply_migration` `nordlicht_app_rpcs_v1` from branch tip sha256 `a6aa6c6f58347cabdf100a01a41ed25c8a078ecb5218b1a4de5b54e771d178c8`.

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
- **69/69** Vitest; typecheck + build OK.
- Remote synthetic smoke (review): import_workspace idempotency + record_goods_receipt over-delivery — **9/9 PASS**, data cleaned up.

### F — Hosting prep

- `docs/supabase-hosting-cloudflare-pages.md`
- `public/_redirects` SPA fallback
- **No** Pages deploy / new prod resources

### G — Deliverable

- Repo + store: `docs/supabase-integration-progress.md`

---

## Demo vs Supabase mode

**Demo (default):** full Workspace v4; book/pay/WE/learning practice local; no AuthGate.

**Supabase:** Auth + org required; book/pay/WE via RPC; master data via PostgREST; import wizard; manual journal + learning practice journal + demo reset off.

---

## Blockers / next

1. ~~Remote apply `app_rpcs_v1` on review~~ — **done** (`tbxdoapspjhabcsxgllx`).
2. `post_learning_practice` still stub — UI honest-disabled in supabase mode.
3. ~~Draft-save async + UUID + repo wire~~ — done (see release readiness).
4. ~~Cloudflare Pages Preview → review~~ — https://nordlicht-preview.pages.dev
5. handels freigabe out of scope — migration gap listed in `docs/nordlicht-release-readiness.md`.

## Safety

- handels (`kicwytgtrdadrhhlfrnn`): untouched (identity peek only)  
- TrueFuel (`ipblsxncnwyizdxudtrc`): untouched (identity peek only)  
- No service_role in frontend/git  
- No pause/delete; no other migrations applied  
