# Supabase Review-DB Results — isoliert lokal

**Stand:** 2026-10-12 · Branch `cursor/uebungsunternehmen-frontend-6a56` / PR #1  
**Remote:** **keine** Verbindung zu `nordlicht-handels` / TrueFuel · kein `apply_migration` / `execute_sql` remote  
**STOP:** Nach diesem Bericht — **keine** Deploy-Freigabe

---

## Umgebung

| Prüfpunkt | Ergebnis |
|-----------|----------|
| Supabase CLI | **nicht** installiert |
| Docker | **nicht** verfügbar |
| PostgreSQL lokal | **ja** — Ubuntu-Paket `postgresql-16` (Cluster `16/main`), DB `nordlicht_review_local` |
| Auth-Simulation | Stub-Schema `auth.users` + `auth.uid()` via `request.jwt.claim.sub` (`supabase/sql/local_review/00_bootstrap_stubs.sql`) |
| Rollen | `anon`, `authenticated`, `service_role` (nologin) |

Das ist **kein** vollständiger Supabase-Stack (kein GoTrue/PostgREST/Studio). Es ist eine isolierte Postgres-16-Review-DB mit minimalen Stubs, damit die Nordlicht-Migrationen und RLS-Negativtests laufen.

**Runner:** `supabase/sql/local_review/run_local_review.sh`  
**Roh-Ausgabe:** `supabase/sql/local_review/out/`

---

## Migrationen (Reihenfolge)

| Schritt | Datei | Ergebnis |
|---------|--------|----------|
| 1 | `local_review/00_bootstrap_stubs.sql` | OK |
| 2 | `migrations/20261012120000_nordlicht_schema_v1.sql` | OK |
| 3 | `migrations/20261012120100_nordlicht_rls_v1.sql` | OK |
| 4 | Grants an `authenticated`/`anon` (Harness) | OK |
| 5 | `sql/rpc_booking_stubs.sql` | OK |
| 6 | `sql/security_checks.sql` (Katalog) | OK nach Syntax-Fix `not (… && …)` |
| 7 | `local_review/10_fixtures_and_negative_tests.sql` | OK — **15/15** Cases bestanden |

Warnung (Harness): Nach Migration werden Tabellenrechte an `authenticated` vergeben — analog typischem Supabase-Default; in Cloud-Projekten können Grants abweichen.

---

## Katalog-Checks (`security_checks.sql`)

Alle erwarteten „0 rows“-Queries lokal **leer**:

| Check | Ergebnis |
|-------|----------|
| Tabellen ohne RLS | 0 rows |
| Helpers ohne DEFINER/`search_path=public` | 0 rows |
| Write-Policies auf Catalogs | 0 rows |
| `NOT EXISTS`-Bootstrap-Policies | 0 rows |
| EXECUTE für `anon`/`public` auf sensiblen Fns | 0 rows |

**Fix im Repo:** `or not (array && …)` statt ungültigem `not &&` in `security_checks.sql`.

---

## Negativtests (ausgeführt)

Quelle: `out/review_results.csv` — **passed=15, failed=0, total=15**

| case_id | ok | detail |
|---------|----|--------|
| MIG_ORGS | ✓ | beide Orgs angelegt |
| SEED_ACCOUNTS | ✓ | 24 Konten |
| A1_NO_BOOTSTRAP_ESCALATION | ✓ | Outsider→Owner blockiert |
| A2_SEED_OWNER_ONLY | ✓ | Student-Seed blockiert |
| A5_TEACHER_NO_OWNER_GRANT | ✓ | Teacher→Owner blockiert |
| A5_TEACHER_CAN_ADD_STUDENT | ✓ | Teacher→Student erlaubt |
| TEACHER_NO_BOOKKEEPING_WRITE | ✓ | Teacher-Invoice blockiert |
| A3_CROSS_ORG_FK | ✓ | Cross-Org-Kunde abgelehnt |
| RLS_CROSS_ORG_SELECT | ✓ | 0 fremde Kunden |
| ANON_NO_CUSTOMERS | ✓ | anon count=0 |
| A4_BOOKED_LINES_IMMUTABLE | ✓ | `row_count=0` (RLS-Deny ohne Exception) |
| SEQ_NO_CLIENT_UPDATE | ✓ | `row_count=0` |
| RPC_STUB_TEACHER_AUTHZ | ✓ | forbidden/STUB |
| LEARNING_PEER_ISOLATION | ✓ | fremde Org sieht 0 Progress |
| JOURNAL_BALANCE | ✓ | unbalanced rejected |

---

## Fehler / Warnungen während des Laufs

1. **Erster Lauf Negativtests:** `create_organization: not authenticated` — Ursache: `set_config(..., is_local=true)` verfiel pro Statement. Behoben: Session-`set_config(..., false)` + `PERFORM` in DO-Blöcken.  
2. **A4 zunächst „failed“:** RLS liefert 0 Rows statt Exception — Testkriterium angepasst (`raised OR row_count=0`); Daten zeigten `quantity` unverändert.  
3. **`security_checks.sql` Syntaxfehler** `not &&` — behoben und Katalog erneut grün.  
4. **Docker / Supabase CLI fehlen** — kein `supabase start`; Stub-PG statt offiziellem Supabase-Local.

---

## Nicht getestet / Grenzen

| Thema | Status |
|-------|--------|
| Echtes Supabase Auth / JWT von GoTrue | nicht |
| PostgREST-Verhalten / API-Keys | nicht |
| Remote `nordlicht-handels` | absichtlich nicht |
| Vollständige Booking-RPC-Bodies | absichtlich nicht (nur Stubs) |
| WE-Überlieferung / Negativbestand-Constraint | nicht (laut Remediation erlaubt) |
| Payment-Overpay-Trigger vs. App-Cent-Rundung | nicht separat gefixturt |
| FORCE RLS auf allen Tabellen | org-Bootstrap absichtlich ohne FORCE |
| Parallele Race zwei `create_organization` | nicht |
| `npm` App-Verhalten mit DB | n/a — App unverändert; `npm test` 60 ✓ |

---

## Deploy-Empfehlung

### Weiterhin: Remote-Deploy nicht freigeben

Lokale Review-DB bestätigt Migrationen + wesentliche Negativpfade unter Stub-Auth. Das ersetzt **nicht**:

- Sign-off auf echtem Supabase-Projekt (Auth/PostgREST/Grants)  
- Implementierung der Booking-RPCs  
- Checks mit echten (anonymisierten) Review-Usern auf isolierter Cloud-DB  

**STOP** — keine weiteren automatischen Deploy-Schritte.

---

## Reproduktion

```bash
# Voraussetzungen: lokales PostgreSQL 16, sudo für peer-auth als postgres
sudo pg_ctlcluster 16 main start   # falls nötig
./supabase/sql/local_review/run_local_review.sh
# Ergebnisse: supabase/sql/local_review/out/review_results.csv
```
