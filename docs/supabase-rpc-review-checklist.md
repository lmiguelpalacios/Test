# Supabase RPC Review-DB Update Checklist

**Stand:** 2026-10-14  
**Branch / PR:** `cursor/supabase-rpc-hardening-2188` — [PR #2](https://github.com/lmiguelpalacios/Test/pull/2) (draft)  
**Ziel (später, nicht jetzt):** nur `nordlicht-security-review` (`tbxdoapspjhabcsxgllx`)  
**Diese Checkliste:** Read-only Bewertung — **kein** remote Apply, **kein** Write-Test, **kein** Deploy.

**Unberührt bleiben:** `nordlicht-handels` (`kicwytgtrdadrhhlfrnn`), TrueFuel (`ipblsxncnwyizdxudtrc`), React/localStorage.

---

## Verdict

### **bereit für Review-Deployment**

Bereit für ein **kontrolliertes** Review-Apply der **zwei neuen** Migrationen nach expliziter User-Freigabe.  
Nicht bereit für `nordlicht-handels`, TrueFuel, oder blindes `db push` über die gesamte Migrationskette.

| Gate | Status |
|------|--------|
| Schema/RLS-Migrationen unverändert (nicht neu schreiben) | OK |
| Neue Migrationen additiv / kompatibel mit Review-Stand | OK |
| Fünf Kern-RPCs: Privilegien, DEFINER, `search_path`, Authz, Org-Bound | OK |
| Lokale Tests üben echte SQL-Funktionen | OK (42/42) |
| Explizite Human-Freigabe vor Apply | **ausstehend** (Stop hier) |
| Auth/PostgREST-E2E | nach Apply (separat), nicht Blocker für SQL-Apply |

**Keine Hard-Blocker** für Review-Apply der zwei neuen Dateien.  
**Prozess-Risiken** (unten) müssen beim Apply beachtet werden — sonst Abbruch.

---

## 1. Diff-Review (PR #2)

Quellen: PR-Diff + `docs/supabase-rpc-implementation-report.md`.

| Änderung | Bewertung |
|----------|-----------|
| `20261012120000_nordlicht_schema_v1.sql` / `…_rls_v1.sql` | **unverändert** — nicht anfassen, nicht neu applyen |
| `20261013140000_nordlicht_grants_v1.sql` | **neu** — Phase-1 Least-Privilege |
| `20261013140100_nordlicht_booking_rpcs_v1.sql` | **neu** — fünf echte RPC-Bodies + Journal/Payment/Stock Revokes |
| `rpc_booking_stubs.sql` | nur Rest-Stubs (goods/learning/import); **keine** Migration |
| `20_booking_rpc_tests.sql` + `run_local_review.sh` | lokaler Harness; ruft echte `public.*` RPCs |
| React / localStorage | unverändert |

---

## 2. Kompatibilität mit Review-DB (`tbxdoapspjhabcsxgllx`)

Aus `docs/supabase-remote-review-results.md` (kein frischer Remote-Call nötig):

| Bereits applied | History-Name (Remote) | Hinweis |
|-----------------|----------------------|---------|
| Schema-Objekte + Catalog | `nordlicht_schema_v1` (`20261013114928`) | Chunked `execute_sql`; History ggf. unvollständig — **Objekte live verifiziert** |
| RLS + 81 Policies | `nordlicht_rls_v1` (`20261013115619`) | History = No-op-Marker nach chunked Apply |
| Booking stubs / RPCs | **nicht** applied | erwartet |

**Lokale Datei-Timestamps** (`20261012120000` / `20261012120100`) **≠** Remote-History-Versionen.  
→ Automatisches „alle fehlenden Migrationen pushen“ ist **unsicher** (könnte Schema/RLS erneut versuchen).

### Kompatibilität der NEUEN Migrationen

| Migration | Erwartung auf Review | Risiko |
|-----------|----------------------|--------|
| `…140000_nordlicht_grants_v1` | Revoke default anon/authenticated Table-GRANTs; enge Grants | **kompatibel** (additiv Privilege-Härtung; Remote hatte Default-GRANTs + RLS) |
| `…140100_nordlicht_booking_rpcs_v1` | `DROP INDEX IF EXISTS document_journal_links_one_booking_idx`; `CREATE OR REPLACE` fünf RPCs + `_nl_*`; Revoke Journal/Payment/Stock DML | **kompatibel** (Index existiert aus Schema; RPCs fehlen noch; `IF EXISTS` / `OR REPLACE` sicher) |

**Regel:** Schema/RLS **nie** neu schreiben oder erneut full-applyen. Nur die zwei neuen Migrationen.

---

## 3. RPC-Security-Review (fünf Kernfunktionen)

Alle fünf: `SECURITY DEFINER`, `SET search_path = public`, `REVOKE` von `public`/`anon`, `GRANT EXECUTE` an `authenticated`, Body-Gate `auth.uid()` + `can_write_org(p_organization_id)`, Zeilen mit `organization_id = p_organization_id` (+ `FOR UPDATE` wo relevant).

| RPC | Privilegien | DEFINER + search_path | Transaktion / Atomarität | Idempotenz | Cross-Org |
|-----|-------------|----------------------|--------------------------|------------|-----------|
| `next_document_number` | auth only EXECUTE | ja | Sequence `FOR UPDATE` + Increment in einem Call | n/a (monoton) | Org nur über `p_organization_id` + Authz |
| `book_sales_invoice` | auth only; Journal/Stock nur via DEFINER | ja | Eine Funktion = Journal+Lines+Links+Stock+`booked_at`; Exception rollt zurück | Retry → `already_booked` | Invoice lookup bound an Org; Outsider/Teacher → `forbidden` |
| `book_vendor_invoice` | wie AR | ja | analog; Expense-Account muss `aufwand` | `already_booked` | analog |
| `record_sales_payment` | auth only; Payment-Insert nur DEFINER | ja | Journal+Lines+Payment+Link atomar | Natural-Key Lookup (kein Unique-Index) | Invoice Org-bound; Overpay/unbooked rejected |
| `record_vendor_payment` | wie ZE | ja | analog | Natural-Key Lookup | analog |

**Interne Helpers** `_nl_*`: EXECUTE von `public`/`anon`/`authenticated` revoked.

**Rest-Risiken (kein Apply-Blocker für Review):** Concurrent Payment-Duplicate ohne Unique-Index; Gross-Helper vs Gruppen-USt bei Bruchteilen; Goods/Learning/Import weiter Stubs; kein Storno-RPC.

---

## 4. Lokale Tests = echte SQL-Funktionen

| Check | Ergebnis |
|-------|----------|
| Harness | `supabase/sql/local_review/run_local_review.sh` → lokale PG-DB `nordlicht_review_local` |
| Apply-Pfad | bootstrap → schema → RLS → **grants** → **booking_rpcs** → rest stubs → security_checks → fixtures → **20_booking_rpc_tests.sql** |
| Aufrufe | direkte `public.next_document_number` / `book_*` / `record_*` unter `SET ROLE authenticated` + JWT `set_config` — **kein** simuliertes TS-Business-Logic |
| Ergebnis | Negativ **16/16**, Booking **26/26**, Combined **42/42** (`out/summary.txt`, CSVs) |
| Security catalog | Expect-0 Queries in `06_security_checks.stdout` alle leer |

Vor Review-Apply erneut lokal grün fahren (Preflight unten).

---

## 5. Zukünftige Apply-Reihenfolge (nur nach Freigabe)

### Strikt — nur Review-Projekt `tbxdoapspjhabcsxgllx`

1. **Nicht** anwenden: `20261012120000_nordlicht_schema_v1.sql`, `20261012120100_nordlicht_rls_v1.sql`
2. Anwenden in dieser Reihenfolge:
   1. `20261013140000_nordlicht_grants_v1.sql` → History-Name z. B. `nordlicht_grants_v1`
   2. `20261013140100_nordlicht_booking_rpcs_v1.sql` → History-Name z. B. `nordlicht_booking_rpcs_v1`
3. **Optional / nicht erforderlich** für die fünf Kern-RPCs: `supabase/sql/rpc_booking_stubs.sql` (Rest-Stubs) — nur wenn Goods/Learning/Import-Stubs auf Review sichtbar sein sollen
4. **Nie** in diesem Schritt: handels, TrueFuel, App-Wiring, Storno

### Preflight (vor Apply)

- [ ] Explizite User-Freigabe „Review apply now“ dokumentiert
- [ ] Target-Projekt per `list_projects` / Dashboard: Name `nordlicht-security-review`, ref `tbxdoapspjhabcsxgllx`, Status healthy
- [ ] Bestätigen: handels + TrueFuel refs **nicht** im Apply-Kommando
- [ ] `list_migrations`: nur Schema+RLS History vorhanden; **keine** grants/booking_rpcs History
- [ ] `list_tables` / Catalog-Stichprobe: 26 public tables, RLS wie Remote-Review-Results
- [ ] Bestätigen: `book_sales_invoice` existiert **noch nicht** (oder nur wenn absichtlich neu)
- [ ] Index `document_journal_links_one_booking_idx` erwartet vorhanden (wird gedroppt)
- [ ] Lokaler Harness erneut: `run_local_review.sh` → 42/42
- [ ] Apply-Methode gewählt: **nur** die zwei SQL-Dateien / `apply_migration` mit neuen Namen — **kein** blindes Rebase der alten Schema/RLS-Dateien

### Apply (Zukunft)

- [ ] Apply `nordlicht_grants_v1` SQL
- [ ] Verify: anon table grants = 0 (security_checks §4)
- [ ] Apply `nordlicht_booking_rpcs_v1` SQL
- [ ] Verify: fünf Funktionen existieren; DEFINER + `search_path=public`; anon EXECUTE = 0
- [ ] Verify: authenticated INSERT auf journal/payments/stock/links = 0
- [ ] Verify: Index `document_journal_links_one_booking_idx` weg

### Integration / Smoke (nach Apply, immer noch nur Review)

SQL-Role (wie Remote-Review; JWT via `set_config` + `SET ROLE` OK für ersten Pass):

- [ ] Owner/Student: `next_document_number` monoton
- [ ] Teacher/Anon/Org-B-Owner: `book_sales_invoice(org_a, …)` → forbidden / no EXECUTE
- [ ] AR book → journal balanced + `booked_at` set; Double-book → `already_booked`
- [ ] ZE idempotent (gleiche Natural Key → gleiche payment id); Overpay fail
- [ ] ER book + ZA analog; bad expense account → rollback, kein Partial
- [ ] Direct `INSERT` in `sales_payments` / `journal_entries` als authenticated → Privilege error
- [ ] Multi-VAT: >1 `document_journal_links` für eine AR

PostgREST / Auth (separater Gate, nicht Teil des SQL-Apply-Freigabes):

- [ ] Echte Auth-User JWT gegen `/rest/v1/rpc/book_sales_invoice`
- [ ] Anon-Key: EXECUTE denied
- [ ] `_nl_*` und Trigger-Fns nicht über API nutzbar
- [ ] service_role vs authenticated Differenz dokumentiert

### Abbruchkriterien

- Jeder Versuch, Schema/RLS erneut full-applyen
- Falsches Projekt / handels / TrueFuel
- Grants-Apply lässt anon Table-DML übrig
- Booking-Apply ohne Revoke der Journal/Payment Direct-Writes
- Lokaler Harness nicht grün vor Start

---

## 6. Stop

**Jetzt stoppen.** Kein Deploy, kein `apply_migration`, kein Write-`execute_sql`, kein Pause/Delete.  
Nächster Schritt nur nach User-Approval dieser Checkliste.
