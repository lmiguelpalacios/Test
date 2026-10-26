# Supabase Security Remediation — lokal (kein Deploy)

**Stand:** 2026-10-12 · Branch `cursor/uebungsunternehmen-frontend-6a56` / PR #1  
**Basis-Audit:** `docs/supabase-security-audit.md`  
**Grenzen:** Kein Remote (`apply_migration` / `execute_sql` nicht ausgeführt). React/localStorage unverändert.  
**Stop:** Nach diesem Dokument — **keine** Deploy-Freigabe.

---

## Migrations-Entscheidung

Die Dateien  
`supabase/migrations/20261012120000_nordlicht_schema_v1.sql` und  
`supabase/migrations/20261012120100_nordlicht_rls_v1.sql`  
wurden **in-place** gehärtet.

**Begründung:** Laut Projektstand und Audit wurden diese Migrationen **nie** auf `nordlicht-handels`, TrueFuel oder einer gemeinsamen Prod-DB angewendet. Es gibt keinen Remote-Schema-Stand v1, der eine additive Follow-up-Migration erzwingen würde.  
Würde jemals ein unverändertes v1 remote liegen, bräuchte es stattdessen eine neue Timestamp-Migration — das ist hier nicht der Fall.

---

## Phase 1 — Behoben (A1→A5)

| ID | Maßnahme | Dateien |
|----|----------|---------|
| **A1** | RLS-`NOT EXISTS`-Bootstrap entfernt. Org-Anlage nur noch `create_organization()` (Org + Owner-Member + Seed atomar). Kein `organizations` INSERT-Policy für Clients. | schema + RLS |
| **A2** | `seed_organization_accounts`: Authz (nur Owner), `search_path`, `REVOKE` public/anon, `GRANT` authenticated. `handle_new_user` ohne Client-EXECUTE. Helpers weiterhin DEFINER + revoke/grant. | schema + RLS |
| **A3** | `unique (organization_id, id)` + composite FKs für Kunden/Lieferanten/Produkte/Belege/Zahlungen/Journal/Lager/Links. | schema |
| **A5** | Teacher-Insert nur `role in ('student','viewer')`. Owner allein für Member-Update/Delete und beliebige Rollen. Teacher **nicht** in `can_write_org`. | RLS |
| **A4** | Line-Policies verlangen Parent `booked_at is null`; BEFORE-Trigger blockieren Line-Writes und Header-Updates wenn gebucht. Client-UPDATE auf Invoices: `booked_at is null` in USING **und** WITH CHECK (Buchung nur künftige DEFINER-RPC). | schema + RLS |

**Korrekturpfad gebuchter Belege:** in v1 bewusst **kein** Client-Edit. Später: explizite Storno-/Korrektur-RPC (nicht „UPDATE der gebuchten Zeile“).

---

## Phase 2 — Umgesetzt / dokumentiert

| Thema | Status |
|-------|--------|
| Soll=Haben | Deferred constraint trigger `journal_lines_balanced_trg` |
| Steuer/Beträge | `CHECK (gross = net + tax)` auf `journal_entries` |
| Doppelbuchung | Partial unique index auf AR/ER-Links; `booked_at`-Immutability |
| Zahlungen | Trigger: nur gebuchte Rechnung; Overpay-Reject (Brutto aus Zeilen, `round`) |
| Sequenzen | Kein UPDATE-Policy mehr für Clients |
| RPC-Stubs | **Nicht** durch fertige Bodies ersetzt. Stubs um Authz + Contract-Kommentare ergänzt (`sql/rpc_booking_stubs.sql`) |
| Teacher Least Privilege | Lesen Org + Lernfortschritt; Member-Admin student/viewer; **keine** Buchhaltungs-Writes; **kein** Import; **kein** Owner-Grant |
| Lager / Negativbestand | **Entscheidung:** Negativbestand vorerst **erlaubt** (Parität zum Client). Kein Summen-Constraint. Vor erstem produktiven WE/Verkauf-Write-Path Produktentscheid erneut prüfen; Durchsetzung dann in `record_goods_receipt` / `book_sales_invoice`. |

---

## Phase 3 — Tests & Artefakte

### Ausgeführt (ehrlich)

| Test | Ergebnis |
|------|----------|
| Statische Review der gehärteten SQL | durchgeführt |
| `npm test` | 60 passed (App unberührt) |
| `npm run typecheck` | OK |
| SQL gegen Postgres/Supabase | **nicht** ausgeführt (keine lokale PG/CLI in der Umgebung; Remote verboten) |
| `security_checks.sql` Szenarien 2a–2l | nur als Skript vorbereitet |

### Erweiterte Checks

`supabase/sql/security_checks.sql` enthält u. a.:

- RLS/DEFINER/`search_path`-Katalogprüfungen  
- Verbot von `NOT EXISTS`-Bootstrap-Policies  
- EXECUTE-Privileg-Scan (anon/public)  
- Kommentierte Rollenszenarien: anon, cross-org, teacher-escalation, gebuchte Lines, unbalanced journal, sequences  

### Voraussetzungen isolierte Review-DB (später, nicht jetzt)

1. Frische DB oder leeres `nordlicht-handels` **ohne** echte Nutzerdaten  
2. Migrationen 120000 + 120100 anwenden  
3. Optional Stubs nur in Review  
4. Fixture-User (owner/teacher/student/viewer × 2 Orgs)  
5. `security_checks.sql` + manuelle Szenarien 2a–2l  
6. **Kein** automatisches Prod-Deploy; erneutes Security-Sign-off nötig  

---

## Offene Risiken (nach Remediation)

| Risiko | Schwere | Hinweis |
|--------|---------|---------|
| Booking-RPC-Bodies fehlen | Hoch für Write-Path | Direct Journal-Insert durch owner/student weiter möglich; Balance-Trigger hilft, Fachbuchung nicht vollständig |
| Payment-Brutto vs. Client-Cent-Rundung | Mittel | Trigger-Formel kann von App-Rundung abweichen — vor Go-Live angleichen |
| `learning_progress` Score manipulierbar | Mittel | Unverändert; später RPC |
| Org-Spam via `create_organization` | Mittel | Jeder Auth-User kann Orgs anlegen |
| FORCE RLS nicht auf org-Bootstrap-Tabellen | Niedrig | Bewusst für `create_organization` ohne BYPASSRLS |
| Runtime unverifiziert | — | Keine Garantie ohne Review-DB-Lauf |
| Negativbestand erlaubt | Niedrig–Mittel | Dokumentierte Produktentscheidung |

---

## Deploy-Status

### Weiterhin: noch nicht freigeben

Remediation ist **lokal im Repo**. Ohne erfolgreiche Checks auf isolierter DB und ohne echte Booking-RPCs bleibt ein Remote-Deploy mit Auth-Traffic **nicht** freigegeben.

Dieser Schritt endet hier (**STOP**).

---

## Geänderte / neue Dateien

- `supabase/migrations/20261012120000_nordlicht_schema_v1.sql` (in-place)  
- `supabase/migrations/20261012120100_nordlicht_rls_v1.sql` (in-place)  
- `supabase/sql/rpc_booking_stubs.sql`  
- `supabase/sql/security_checks.sql`  
- `supabase/SCHEMA.md`  
- `supabase/README.md`  
- `docs/supabase-security-remediation.md` (dieses Dokument)  
- Audit-Hinweis ergänzt in `docs/supabase-security-audit.md`  
