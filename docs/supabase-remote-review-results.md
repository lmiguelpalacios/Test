# Supabase Remote Review Results

**Stand:** 2026-10-13  
**Empfehlung Review-Env:** **PASS** (mit dokumentierten Lücken)  
**Produktives Deploy auf `nordlicht-handels`:** **nicht freigegeben**

## Target (verifiziert)

| Feld | Wert |
|------|------|
| Name | `nordlicht-security-review` |
| project_id / ref | `tbxdoapspjhabcsxgllx` |
| Organisation | Nordlicht (`iwolvmzjskpgzuiddewn`) |
| Region | `eu-central-1` |
| Status | `ACTIVE_HEALTHY` |
| Postgres | 17.11 |

**Nicht angefasst:** `kicwytgtrdadrhhlfrnn` (nordlicht-handels), `ipblsxncnwyizdxudtrc` (TrueFuel). Review-Projekt nicht pausiert/gelöscht.

## Migrations

| Name | History | Apply-Pfad |
|------|---------|------------|
| `nordlicht_schema_v1` | `20261013114928` | Schema-Objekte via `execute_sql` (chunked); History-Eintrag existierte bereits (Inhalt beim Record ggf. unvollständig — Objekte danach vervollständigt) |
| `nordlicht_rls_v1` | `20261013115619` | Helpers waren bereits vorhanden; ENABLE/FORCE RLS + 81 Policies via `execute_sql` (chunked wegen MCP-Payload-Größe); History per `apply_migration` mit No-op-Marker + Kommentar (volle Datei war nach Apply nicht erneut ausführbar) |

Quelle: `/tmp/nordlicht-migrations/20261012120000_nordlicht_schema_v1.sql`, `…/20261012120100_nordlicht_rls_v1.sql` (Branch `cursor/uebungsunternehmen-frontend-6a56`).  
`rpc_booking_stubs` **nicht** angewendet.

## Catalog (nach Apply)

| Check | Ergebnis |
|-------|----------|
| Public tables | 26 |
| RLS enabled | 26/26 |
| FORCE RLS | 22 (wie Migration: ohne `organizations` / `organization_members` / catalogs) |
| Policies | 81 |
| Foreign keys | 47 |
| CHECK constraints | 208 |
| UNIQUE constraints | 42 |
| User triggers (non-internal) | 7 |
| Seed catalogs | `account_templates`=24, `learning_tasks`=12 |

### security_checks.sql §0 / §3 (Expect: 0 rows)

| Check | Result |
|-------|--------|
| Tables without RLS (listed set) | PASS (0) |
| Helpers DEFINER + `search_path=public` | PASS (0 bad) |
| No authenticated write policies on `account_templates` / `learning_tasks` | PASS (0) |
| No `NOT EXISTS` bootstrap text on `organization_members` policies | PASS (0) |
| anon/public EXECUTE on `create_organization` / `seed_organization_accounts` / `handle_new_user` / `book_sales_invoice` | PASS (0; `book_sales_invoice` existiert nicht) |

### Grants (Hinweis)

Supabase-Default: `anon` und `authenticated` haben **Table-GRANTs** (inkl. INSERT/UPDATE/DELETE) auf allen public Tables. Kontrolle liegt bei **RLS** (keine anon-Policies → anon sieht/schreibt nichts). Das ist erwartet, aber kein Ersatz für enge GRANTs in einer späteren Härtungsrunde.

## Security / Negative Tests (JWT via `request.jwt.claim.*` + `SET LOCAL ROLE`)

Synthetic Auth-Rows in `auth.users` (nicht Auth Admin API). Fixtures: Org A/B, Owner/Teacher/Student/Outsider, Customers/Products/Invoices, Learning-Progress. Danach bereinigt.

| ID | Szenario | Expected | Result | Detail |
|----|----------|----------|--------|--------|
| probe | `auth.uid()` matches JWT sub | match | **PASS** | |
| 2a | anon `customers` | 0 or error | **PASS** | count=0 |
| 2b | Owner A cannot SELECT Org B customers | 0 | **PASS** | count=0 |
| ctrl | Owner A sees Org A customers | ≥1 | **PASS** | count=1 |
| 2c | Teacher INSERT `sales_invoices` | fail | **PASS** | RLS violation |
| 2d | Teacher INSERT member role=`owner` | fail | **PASS** | RLS violation |
| 2e | Teacher INSERT member role=`student` | success | **PASS** | inserted then removed |
| 2f | Outsider INSERT self as owner on Org A | fail | **PASS** | RLS violation |
| 2g | Outsider `seed_organization_accounts(OrgA)` | owner required | **PASS** | exception text |
| 2h | Invoice Org A + customer Org B | FK violation | **PASS** | composite FK |
| 2i | Student UPDATE booked invoice line | 0 rows or exception | **PASS** | row_count=0 (RLS first) |
| 2i′ | Service-role UPDATE booked line | trigger exception | **PASS** | lines immutable |
| 2j | Student A2 cannot see Student A progress | 0 | **PASS** | count=0 |
| 2k | Unbalanced `journal_lines` + `SET CONSTRAINTS ALL IMMEDIATE` | exception | **PASS** | unbalanced |
| 2l | Student UPDATE `document_sequences` | 0 or fail | **PASS** | row_count=0 |

## Untested / Limitations (honest)

- **No real Supabase Auth API** (signup/login/JWT issuance/refresh). Claims were injected with `set_config` + `SET LOCAL ROLE` inside SQL as the privileged MCP role.
- **No PostgREST / anon-key HTTP** end-to-end.
- **No `book_sales_invoice` / booking RPCs** (not deployed; by design).
- **Storage, Edge Functions, Realtime** not in scope.
- **Schema migration history** for `nordlicht_schema_v1` may not contain the full SQL blob (chunked apply); objects were verified live.
- **`nordlicht_rls_v1` history** is a marker after chunked `execute_sql` (full re-apply would collide with existing policies).
- Teacher “positive” write paths beyond member-insert not exhaustively matrixed.
- Default broad table GRANTs to `anon` not revoked (RLS-only mitigation).

## Cleanup

Synthetic `@review.test` users, orgs, business rows, and helper table `_review_security_test_results` removed. Seed catalogs retained. Review project left **ACTIVE_HEALTHY**.

## Recommendation

| Scope | Verdict |
|-------|---------|
| Review env `tbxdoapspjhabcsxgllx` | **PASS** — schema+RLS applied; catalog + JWT negative matrix green |
| Deploy to `nordlicht-handels` | **FAIL / not approved** — requires separate go-ahead after Auth-API E2E and ops checklist |
