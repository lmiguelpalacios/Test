# Plan: Isolierte Supabase-Remote-Review-Umgebung

**Art:** nur Dokumentation · **Stand:** 2026-10-12  
**Branch/PR:** `cursor/uebungsunternehmen-frontend-6a56` / PR #1  
**Status dieses Dokuments:** Plan — **nichts erstellt, nichts deployt**, auf Freigabe warten.

### Harte Grenzen (gelten auch für die spätere Ausführung)

- **Nicht** in diesem Schritt: `create_project`, `create_branch`, `apply_migration`, `execute_sql`, Pause/Delete fremder Projekte  
- **Nicht anfassen:** `nordlicht-handels` (`kicwytgtrdadrhhlfrnn`), TrueFuel v0.1 (INACTIVE)  
- React-App / localStorage unverändert lassen, bis ein eigener Implementierungsschritt es verlangt  
- Keine erfundenen Testergebnisse; lokale Results nur zitieren

### Bezüge

| Dokument | Rolle |
|----------|--------|
| `docs/supabase-review-results.md` | lokale PG-16-Review: Migrationen OK, 15/15 Negativtests |
| `docs/supabase-security-remediation.md` | A1–A5 + Phase 2 lokal behoben |
| `docs/supabase-security-audit.md` | historischer Audit (vor Remediation) |
| Store `docs/supabase-implementierungsplan.md` | Phasen 0–6; Remote-Review ≈ Vorbereitung vor Phase-1-Deploy auf Zielprojekt |
| Store `docs/supabase-architektur.md` | Zielschema / RLS-Prinzip |
| Store `internal/supabase-remote-review-mcp.md` | MCP read-only Kosten/Org-Befunde |

---

## 1. Warum Remote-Review zusätzlich zur lokalen DB?

Die lokale Harness (`supabase/sql/local_review/`) prüft SQL/RLS unter **Stub-Auth** auf Stock-PostgreSQL 16. Offen bleiben u. a.:

- echtes GoTrue / JWT / `auth.uid()`  
- PostgREST-Grants und Default-Privileges  
- Dashboard-Auto-RLS vs. explizite Policies  
- MCP-/CLI-`apply_migration`-Pfad  
- ggf. `extensions`-Schema und Auth-Trigger wie in gehostetem Supabase  

Remote-Review schließt diese Lücke **ohne** Prod (`nordlicht-handels`) und ohne TrueFuel.

---

## 2. Empfohlene Isolationsstrategie

| Option | Bewertung |
|--------|-----------|
| **A — Neues temporäres Projekt** in Org Nordlicht (z. B. `nordlicht-review-tmp`) | **Empfohlen.** Volle Isolation; kein Parent-Bezug zu Prod. |
| B — `create_branch` auf `nordlicht-handels` | **Nicht empfohlen** für ersten Security-Pass: Branch hängt am Prod-Projekt; Policies/Kosten/Verwechslung mit Prod-Risiko. Nur falls Org explizit Branch-Workflow will und Prod read-only bleibt. |
| C — TrueFuel reaktivieren | **Verboten** laut Auftrag / Implementierungsplan. |
| D — Migrationen direkt auf `nordlicht-handels` | **Verboten** bis separates Sign-off nach erfolgreicher Temp-Review. |

**Region:** `eu-central-1` (wie nordlicht-handels), sofern bei `create_project` wählbar.  
**Nach Review:** Temp-Projekt pausieren oder löschen (nur nach Freigabe; nicht Teil dieses Plan-Schritts).

---

## 3. Voraussetzungen (Checkliste vor Ausführung)

### 3.1 Organisation & Zugang

- [ ] Org Nordlicht `iwolvmzjskpgzuiddewn` — Plan laut MCP: **free** / `tier_free`  
- [ ] Ausführende Person/Agent hat Recht, **ein** neues Projekt anzulegen (MCP `create_project` laut Coordinator möglich — hier nicht ausgeführt)  
- [ ] Free-Plan-**Projektlimit** der Org bestätigt (Docs/Dashboard) — MCP: als Risiko kennzeichnen, nicht als gemessen behaupten  
- [ ] `list_projects` kann unzuverlässig sein → neues Projekt per `get_project` **by ID** verifizieren  

### 3.2 Kosten (MCP read-only, nicht nachmessen in diesem Schritt)

| Befund | Quelle |
|--------|--------|
| `get_cost` type=`project` für Org Nordlicht | **0 € / Monat** |
| Plan | free / tier_free |

Implikation: ein temporäres Free-Projekt ist kostenmäßig unkritisch, **solange** Limits (Anzahl Projekte, Pause-Policy) eingehalten werden. Keine Kosten-Garantie über MCP hinaus — vor Anlegen Dashboard/Docs prüfen.

### 3.3 Repo-Artefakte (bereits vorhanden)

- [ ] Migrationen: `20261012120000_…`, `20261012120100_…`  
- [ ] Optional Review-only: `sql/rpc_booking_stubs.sql` (Stubs, keine fertigen Buchungsbodies)  
- [ ] `sql/security_checks.sql` + Negativtests aus `sql/local_review/10_fixtures_and_negative_tests.sql` (an echte Auth-User anpassen)  
- [ ] Lokale Baseline grün: `docs/supabase-review-results.md` (15/15)

### 3.4 Testidentitäten (anzulegen auf dem Temp-Projekt — erst nach Freigabe)

Mindestens 6 Auth-User (E-Mail/Magic-Link oder Dashboard), analog lokal:

| Rolle | Zweck |
|-------|--------|
| owner-a, owner-b | zwei Orgs |
| teacher-a, student-a, viewer-a | Least Privilege |
| outsider | Eskalation / Cross-Org |

Keine echten Schülerdaten; nur synthetische Adressen.

### 3.5 Was bewusst **nicht** Voraussetzung ist

- App-Client / `VITE_SUPABASE_*` (Implementierungsplan Phase 2 — später)  
- Fertige Booking-RPC-Bodies (Phase 4)  
- Import-Wizard / Workspace-v4-Upload  

---

## 4. Sichere Ausführungsreihenfolge (nach Freigabe)

Jeder Schritt endet mit Go/No-Go. Bei No-Go: stoppen, Temp-Projekt nicht für Prod zweckentfremden.

```
0  Schriftliche Freigabe: „Temp-Projekt anlegen + Migrationen nur dort“
1  create_project (Name z. B. nordlicht-review-tmp, Region eu-central-1)
2  get_project(id) — ACTIVE_HEALTHY verifizieren; ID dokumentieren
3  apply_migration schema v1  →  apply_migration RLS v1  (nur dieses Projekt)
4  Optional: rpc_booking_stubs.sql nur auf Temp (klar als Stub kennzeichnen)
5  security_checks.sql (Katalog) via execute_sql / SQL-Editor — Expect 0 rows
6  Fixture-User + create_organization / Members (echte JWTs)
7  Negativtest-Matrix (§5) — Ergebnisse in neuem Bericht dokumentieren
8  Go/No-Go für „Schema tauglich für späteres nordlicht-handels“
9  Temp-Projekt pausieren/löschen (eigene Freigabe); Secrets nicht committen
```

**Explizit verboten in dieser Sequenz:** Migrationen oder SQL gegen `nordlicht-handels` oder TrueFuel; Prod-Datenimport; App auf Temp umbiegen ohne Feature-Flag-Plan.

---

## 5. Testfälle (Remote)

### 5.1 Übernahme aus lokaler Suite (müssen erneut bestehen)

Dieselben case_ids wie in `docs/supabase-review-results.md` — **Remote-Ergebnisse liegen noch nicht vor** (nicht erfinden):

| case_id | Fokus |
|---------|--------|
| MIG_ORGS / SEED_ACCOUNTS | `create_organization` + Konten-Seed |
| A1_NO_BOOTSTRAP_ESCALATION | kein Owner-Self-Insert auf fremde Org |
| A2_SEED_OWNER_ONLY | Seed nur Owner |
| A5_* / TEACHER_NO_BOOKKEEPING_WRITE | Teacher least privilege |
| A3_CROSS_ORG_FK / RLS_CROSS_ORG_SELECT | Mandantentrennung |
| ANON_NO_CUSTOMERS | anon |
| A4_BOOKED_LINES_IMMUTABLE | gebuchte Lines |
| SEQ_NO_CLIENT_UPDATE | Sequenzen |
| RPC_STUB_TEACHER_AUTHZ | Stub-Authz (falls Stubs deployed) |
| LEARNING_PEER_ISOLATION | Lernfortschritt |
| JOURNAL_BALANCE | Soll=Haben |

Anpassung nötig: lokale `set_config('request.jwt.claim.sub')` → echte Session (SQL-Editor „run as user“ / Client mit User-JWT / `auth.uid()`).

### 5.2 Zusätzlich nur auf gehostetem Supabase sinnvoll

| ID | Test | Erwartung |
|----|------|-----------|
| R1 | Auth-Trigger `handle_new_user` bei Sign-up | `profiles`-Zeile entsteht |
| R2 | PostgREST: `anon` Key SELECT `customers` | leer / denied |
| R3 | PostgREST: student JWT INSERT Invoice eigene Org | erlaubt |
| R4 | PostgREST: teacher JWT INSERT Invoice | denied |
| R5 | Service-Role umgeht RLS (nur Server) | dokumentieren; **nie** im Frontend |
| R6 | Migration history / zweite Apply | idempotent bzw. tracked, kein Doppel-Seed-Crash |
| R7 | Dashboard Auto-RLS vs. Repo-Policies | keine widersprüchlichen Doppel-Policies |
| R8 | `get_publishable_keys` nur für Temp; nicht committen | Keys nur in Secret-Store |

### 5.3 Bewusst später (nicht Blocker für Schema-Review)

- Vollständige `book_*` / `record_*` Bodies  
- Overpay-Rundung vs. App-Cent  
- WE-Aggregation / Negativbestand-Produktentscheid  
- Workspace-v4-Import  

---

## 6. Kosten & Limits (Planungsannahmen)

| Thema | Annahme / MCP-Befund | Aktion vor Ausführung |
|-------|----------------------|------------------------|
| Projektkosten | `get_cost` project → **0 €/Monat** (Org free) | Vor Anlegen erneut `get_cost` / Dashboard |
| Projektanzahl | Free-Orgs oft limitiert | Limit bestätigen; ggf. altes Temp pausieren |
| Laufzeit Temp | Tage bis Wochen | Pause nach Review |
| Traffic | nur synthetische Tests | kein Lasttest nötig |
| TrueFuel | INACTIVE, irrelevant | nicht reaktivieren „für Platz“ |

Keine Euro-Beträge erfinden, die MCP nicht geliefert hat.

---

## 7. Risiken

| Risiko | Schwere | Mitigation |
|--------|---------|------------|
| Verwechslung Temp ↔ `nordlicht-handels` | Hoch | IDs in Runbook; Commands immer mit Project-Ref; nie Prod-ID in Apply-Skripten defaulten |
| Free-Plan-Limit blockiert `create_project` | Mittel | Vorher Limits prüfen; Alternative nur mit Freigabe |
| `list_projects` unvollständig | Mittel | `get_project` by ID |
| Branch statt Temp-Projekt | Hoch | Option B vermeiden |
| Stubs als „fertig“ missverstanden | Mittel | Stub-Raises belassen; Booking-RPCs eigener Schritt |
| Keys in Git | Hoch | nur Temp-Publishable; `.gitignore` / keine Commit-Secrets |
| Auto-RLS überschreibt Erwartungen | Mittel | Nach Apply Policies listen (`pg_policies`) |
| Lokale 15/15 ≠ Remote-Parität | Mittel | Suite bewusst erneut fahren; Differenzen dokumentieren |

---

## 8. Go/No-Go nach Remote-Review

**Go (Schema-Sign-off für späteres Prod-Deploy-Planen)** nur wenn:

1. Beide Migrationen auf **Temp**-Projekt clean  
2. Katalog-`security_checks` + Matrix §5.1 grün unter echter Auth  
3. R1–R4 (Mindest-Remote) grün  
4. Schriftlicher Diff lokal vs. remote (Abweichungen erklärt)  
5. Temp-Projekt-ID und Zeitpunkt dokumentiert  

**No-Go / kein Deploy auf `nordlicht-handels`:** jeder kritische Fail (A1–A3, Cross-Org, anon Write, Teacher-Escalation).

Selbst bei Go: **dieses Dokument gibt kein Prod-Deploy frei** — dafür eigener Auftrag nach Implementierungsplan (Phase 1 Exit → bewusste Prod-Entscheidung).

---

## 9. Abbruch & Aufräumen (nach Freigabe zur Ausführung)

1. Keine weiteren Migrationen auf Temp nach Sign-off ohne Versionierung im Repo  
2. Temp pausieren oder löschen  
3. Review-Keys rotieren/verwerfen  
4. Kurzbericht: bestanden / fehlgeschlagen / Abweichungen zu lokal  

---

## 10. Was dieser Schritt bewusst nicht tut

- Kein `create_project` / keine Migration remote  
- Kein Anfassen von nordlicht-handels oder TrueFuel  
- Keine Booking-RPC-Implementierung  
- Keine App-Anbindung  
- **STOP** — warten auf Freigabe zur Ausführung von §4  

---

## Anhang — MCP-Kurzbefunde (Coordinator)

Siehe `internal/supabase-remote-review-mcp.md`:

- Org `iwolvmzjskpgzuiddewn`: free, `get_cost` project = 0 €/Monat  
- `create_project` / `create_branch` existieren (nicht ausführen hier)  
- `nordlicht-handels` ACTIVE_HEALTHY eu-central-1 — nicht anfassen  
- TrueFuel INACTIVE — nicht anfassen  
