# Supabase Security & Consistency Audit — Schema v1

**Stand:** 2026-10-12 · Branch `cursor/uebungsunternehmen-frontend-6a56` / PR #1  
**Art:** Nur statischer Audit (SQL lesen). **Kein** Remote, **kein** `apply_migration` / `execute_sql`, SQL-Dateien unverändert.  
**Geprüft:**  
`supabase/migrations/20261012120000_nordlicht_schema_v1.sql`,  
`supabase/migrations/20261012120100_nordlicht_rls_v1.sql`,  
`supabase/sql/rpc_booking_stubs.sql`,  
`supabase/sql/security_checks.sql`,  
`supabase/SCHEMA.md`

**Methode:** Code-Review der SQL-Texte. Laufzeitverhalten (echte JWT-Sessions, Cross-Org-Smoke) wurde **nicht** gegen eine Datenbank verifiziert.

---

## Empfehlung (kurz)

### Noch nicht freigeben

Deployment auf **nordlicht-handels** (oder jede Umgebung mit erreichbarem `authenticated`-Client) ist **nicht freizugeben**, solange die kritischen Mandanten-/Privilege-Befunde unten nicht behoben und per Review-DB nachgeprüft sind.

Eine leere „nur Schema anschauen“-Sandbox ohne User-Traffic mindert das Risiko nicht ausreichend: die Bootstrap- und DEFINER-Lücken sind aus dem SQL allein ableitbar und würden mit dem ersten Login wirksam.

App bleibt korrekt auf localStorage — das entlastet **nicht** ein verfrühtes DB-Deploy mit Auth.

---

## Schweregrade

| Stufe | Bedeutung |
|-------|-----------|
| **Kritisch** | Mandantenbruch oder Privilege-Escalation aus SQL ableitbar |
| **Hoch** | Integrität/Buchhaltung oder sensible Writes ohne wirksamen Schutz |
| **Mittel** | Erhöhtes Missbrauchs-/Betriebsrisiko; vor Write-Path beheben |
| **Niedrig** | Härtung / Doku / Testlücken |

---

## A) Bestätigte Fehler (aus SQL ableitbar)

### A1 — Kritisch: Owner-Bootstrap unter RLS sieht bestehende Members nicht

**Datei:** `migrations/20261012120100_nordlicht_rls_v1.sql`  
**Policy:** `organization_members_insert_owner_teacher`

```sql
role = 'owner'
and user_id = auth.uid()
and not exists (
  select 1 from public.organization_members m
  where m.organization_id = organization_members.organization_id
)
```

Die `NOT EXISTS`-Subquery unterliegt RLS. Ein Nicht-Mitglied sieht fremde Member-Zeilen typischerweise **nicht** (`organization_members_select` erlaubt fremde Rows nur über `is_org_member`, das für Nicht-Mitglieder false ist). Damit wertet `NOT EXISTS` für Außenstehende oft als **wahr**, obwohl die Org bereits einen Owner hat.

**Folge:** Jeder `authenticated` User kann sich voraussichtlich als zusätzlicher `owner` in eine beliebige bekannte `organization_id` einfügen (sofern Insert sonst durchgeht).

**Korrektur (Richtung):** Bootstrap nur über SECURITY DEFINER-RPC (`create_organization` legt Org + erste Member-Zeile atomar an); oder `NOT EXISTS` in einer DEFINER-Funktion ohne RLS; niemals rohe Self-Join-Subquery unter RLS für „erste Member“-Logik.

---

### A2 — Kritisch: `seed_organization_accounts` ist SECURITY DEFINER ohne Authz / ohne REVOKE

**Datei:** `migrations/20261012120000_nordlicht_schema_v1.sql`

- `security definer` + `set search_path = public` ✓  
- **Keine** Prüfung von `auth.uid()` / Mitgliedschaft  
- **Kein** `revoke all … from public` / gezieltes `grant` in der Migration  

**Folge:** Je nach Default-EXECUTE-Privilegien (Postgres/Supabase oft breit) kann ein Caller Konten und `document_sequences` für **beliebige** `p_org_id` schreiben und dabei RLS umgehen.

**Korrektur:** Am Anfang der Funktion `can_write_org`/`has_org_role(..., owner|teacher)` erzwingen; `revoke all from public`; `grant execute` nur an `authenticated` (oder nur service_role + interne Trigger).

---

### A3 — Kritisch: Keine DB-Garantie gleicher `organization_id` über FKs

**Datei:** `migrations/20261012120000_nordlicht_schema_v1.sql`

FK prüft Existenz der Parent-UUID, **nicht** Org-Gleichheit. Beispiele:

| Kind | FK | Fehlende Org-Kopplung |
|------|-----|------------------------|
| `sales_invoices.customer_id` | `customers(id)` | Invoice Org A + Kunde Org B |
| `sales_invoice_lines.product_id` | `products(id)` | Zeile Org A + Produkt Org B |
| `purchase_orders.supplier_id` | `suppliers(id)` | analog |
| `goods_receipts.order_id` | `purchase_orders(id)` | WE Org A + Bestellung Org B |
| `goods_receipt_lines.order_line_id` | `purchase_order_lines(id)` | analog |
| `vendor_invoices.supplier_id` / `order_id` | … | analog |
| `sales_payments.invoice_id` / `journal_entry_id` | … | Zahlung/Journal fremder Org |
| `stock_movements.product_id` | `products(id)` | Bestand fremdes Produkt |
| `journal_lines.journal_entry_id` | `journal_entries(id)` | Zeilen-Org ≠ Header-Org möglich |

RLS prüft nur die `organization_id`-Spalte der **geschriebenen** Zeile (`can_write_org(organization_id)`), nicht die Org des referenzierten Parents.

**Folge:** Mandantenvermischung auf Datenebene bei direktem Client-Insert (auch ohne Policy-Bypass).

**Korrektur:** Composite FKs `(organization_id, parent_id)` → Unique `(organization_id, id)` auf Parents; oder Trigger/`WITH CHECK` die Parent-Org lesen (DEFINER) und vergleichen; kritische Pfade nur über RPCs die Org aus dem Parent ableiten.

---

### A4 — Hoch: Positionen gebuchter Belege bleiben per Policy änderbar

**Datei:** `…_rls_v1.sql`

- Header: `sales_invoices_update` / `vendor_invoices_*` verlangen `booked_at is null`  
- **Lines:** `sales_invoice_lines_update/delete` und `vendor_invoice_lines_*` prüfen **nur** `can_write_org` — kein Bezug zu `booked_at` des Headers  

**Folge:** Nach Buchung können Writer Beträge/Mengen der Positionen ändern; Header wirkt „gesperrt“, Zahlen nicht.

**Korrektur:** Policy/`EXISTS` auf Parent `booked_at is null`; besser: Line-Writes nur über RPC; nach Buchung keine Line-Policies für UPDATE/DELETE.

---

### A5 — Hoch: Teacher darf Member mit Rolle `owner` anlegen

**Datei:** `…_rls_v1.sql` · Policy `organization_members_insert_owner_teacher`

`with check` erlaubt Insert wenn Caller `owner|teacher` ist — **ohne** Einschränkung der Spalte `role`.

**Folge:** Teacher kann sich oder andere zu `owner` machen (Privilege-Escalation innerhalb der Org).

**Korrektur:** Teacher nur `student|viewer` (ggf. `teacher`) einfügen; nur `owner` darf `owner`/`teacher` setzen.

---

### A6 — Hoch: Buchhaltungsintegrität nur clientseitig denkbar; RPC = Stubs

**Dateien:** Schema + `sql/rpc_booking_stubs.sql` + RLS Insert auf Journal/Zahlungen/Sequenzen

Bestätigt fehlend in Constraints/Triggern:

| Regel | Status im SQL |
|-------|----------------|
| Summe Soll = Haben über `journal_lines` | nicht erzwungen |
| `gross_amount_cents = net + tax` | kein Check |
| Doppelbuchung (`booked_at` einmalig + Links) | kein Unique/Partial Index; Direct Insert setzt `booked_at` frei |
| Überzahlung | kein Constraint; Payment-INSERT für jeden Writer |
| WE Restmenge aggregiert | nicht erzwungen |
| Atomare Nummernkreise | `document_sequences` UPDATE für alle Writer offen |
| Journal UPDATE | keine Update-Policy (gut), aber Insert beliebig |

RPCs existieren nur als **raise-Stubs** und sind **keine** Migration — serverseitige Buchungslogik fehlt.

**Folge:** Sobald ein Client mit User-JWT schreibt, sind Doppelbuchung, Unbalanced Journal und Sequenz-Manipulation möglich.

---

### A7 — Mittel: Seeds nicht idempotent

**Datei:** `…_schema_v1.sql`  
`insert into account_templates` / `learning_tasks` ohne `on conflict`.

Zweiter Lauf derselben Migration (außerhalb Supabase-Versions-Tracking) → PK-Konflikt. Für normales `supabase migration up` einmalig ok; für manuelles Re-Apply riskant.

---

## B) Mögliche Risiken (plausibel, nicht runtime-bewiesen)

| ID | Thema | Risiko | Anmerkung |
|----|--------|--------|-----------|
| B1 | Default table GRANTs an `anon`/`authenticated` | Mittel | Mit RLS und fehlenden anon-Policies eher Deny — **unverified** ohne `\dp` / Catalog-Query |
| B2 | Kein `FORCE ROW LEVEL SECURITY` | Mittel | Rollen mit BYPASSRLS / Table-Owner umgehen RLS; `service_role` bypassed by design |
| B3 | `organizations_insert` `with check (true)` | Mittel | Org-Spam / Ressourcen; jeder Auth-User legt Orgs an |
| B4 | Shared-Org Write für **student** = voller `can_write_org` | Mittel–Hoch | Schüler können Journal/Belege der Klasse löschen/ändern (Delete oft teacher/owner, aber Insert/Update breit) |
| B5 | Teacher = Writer auf Belege/Journal | Mittel | Für Demo-Lehrer oft gewollt; **nicht** eng für „nur Fortschritt lesen + Aufgaben betreuen“ |
| B6 | `learning_progress` Update ohne Score-Cap / ohne RPC | Mittel | User setzt `completed`/`best_score` beliebig |
| B7 | `document_journal_links.document_id` ohne FK | Niedrig–Mittel | Orphans / falsche Verknüpfung |
| B8 | Kein Unique `(organization_id, document_number)` auf Journal | Mittel | Doppelte Belegnummern |
| B9 | Negativbestand | Mittel | Kein Check auf Summe `quantity_delta`; Client erlaubt Negativ — **muss nicht** vor rein lokalem Schema-Review behoben werden, **muss** vor produktivem WE/Verkauf-Write-Path |
| B10 | Race beim echten „first member“ | Mittel | Selbst mit korrektem DEFINER-Count: zwei parallele Bootstraps ohne Unique „genau ein owner“ |
| B11 | `security_checks.sql` unvollständig | Niedrig | Keine Grant-/FK-Org-/Bootstrap-Tests; Check 5–8 nur Kommentare |
| B12 | Stub-RPCs bei versehentlichem Apply | Niedrig | Nur `raise` — sicher, aber DEFINER-Fläche; Grants an `authenticated` ok solange Stub |

### Rolle `teacher` — angemessen eingeschränkt?

**Nein, nicht eng genug für eine typische Lernplattform.**

Aktuell: Teacher ≈ Owner beim Schreiben von Unternehmensdaten (`can_write_org`) plus Lesen aller Lernfortschritte; zusätzlich Member-Insert inkl. potenziell `owner` (A5).

Angemessener Minimal-Schnitt für Schule (Vorschlag, nicht umgesetzt):

| Fähigkeit | teacher |
|-----------|---------|
| Org-Daten lesen | ja |
| Lernfortschritt Klasse lesen | ja |
| Mitglieder student/viewer verwalten | ja |
| Journal/Belege schreiben | optional / Feature-Flag (Demo-Modus) |
| Owner ernennen / Org umbenennen | nein |
| Import-Batches | ja oder nur owner |

---

## C) Ungeprüfte Annahmen

1. Supabase-Default: RLS für `anon` ohne Policy = kein Zugriff (üblich, hier nicht live verifiziert).  
2. `auth.uid()` in Helpers zuverlässig unter PostgREST JWT (Standard — nicht getestet).  
3. Migration läuft in einer Transaction als Superuser/Migrator (Supabase CLI üblich).  
4. `pgcrypto` / `gen_random_uuid` im Zielprojekt verfügbar (`create extension … with schema extensions`).  
5. Kein zusätzliches Auto-RLS-Overlay im Dashboard, das Policies verdoppelt oder widerspricht.  
6. App bleibt ohne Supabase-Client → DB-Risiken betreffen erst Auth+Client oder manuelle SQL-User.  
7. `proconfig`-Vergleich in `security_checks.sql` matched exakt `search_path=public` (Formatvarianten möglich).

---

## Prüfpunkt-Matrix

| # | Thema | Ergebnis |
|---|--------|----------|
| 1 | RLS je Op / Grants / anon | RLS auf allen 26 Tabellen enabled; Policies durchgängig `to authenticated`; **keine** anon-Policies sichtbar. Table/Default-GRANTs **nicht** im SQL definiert → unverified. Lücken: A1, A4, A5, Line-Updates, Sequences. |
| 2 | SECURITY DEFINER Helpers | `is_org_member` / `has_org_role` / `can_write_org` / `org_member_role`: DEFINER + `search_path=public` + revoke/grant authenticated — **gut**. Zusätzlich A2 (`seed_organization_accounts`) und Stub-RPCs DEFINER. |
| 3 | Mandantentrennung | Org-Spalte + Member-Check vorhanden; **FK-Org-Kopplung fehlt (A3)**; Bootstrap-Escalation (A1). |
| 4 | Buchhaltung | Constraints teilweise (USt-Werte, Zeile Soll XOR Haben); Balance/Steuer-Summe/Doppelbuchung/Zahlungen **offen**; RPC = Stubs (A6). |
| 5 | Lernmodus | Tasks: nur SELECT-Policy für authenticated (Write über Policy verweigert). Progress: Insert/Update nur `auth.uid()`; Teacher/Owner SELECT Org — **sinnvoll**. Score-Manipulation möglich (B6). |
| 6 | Lager | Keine Negativ-Grenze; vor Deploy des Write-Path klären; **kein Blocker** solange keine DB-Writes (siehe Empfehlung). |
| 7 | Migrationen | Reihenfolge schema→RLS ok; Seeds nicht idempotent (A7); Stubs nicht in `migrations/` (gut). |
| 8 | Tests ohne Remote | Statischer Review + bestehende App-`npm test` (unabhängig). **Keine** Policy als „runtime-sicher“ behauptet. `security_checks.sql` nicht ausgeführt. |

---

## Was ohne Remote-DB prüfbar war

- Vollständige Text-Review der genannten Dateien  
- Ableitung logischer Policy-/FK-Fehler (A1–A6)  
- Abgleich mit `SCHEMA.md` (Dokumentation spiegelt Intent; verschleiert A1/A2/A3 nicht explizit als Bug)

**Nicht geprüft:** echte Cross-Org-Queries, Grant-Katalog, FORCE RLS, Extension-Install, Performance der Helpers.

---

## Empfohlene Korrektur-Reihenfolge (nächste Migration — hier nicht umgesetzt)

1. **A1** Bootstrap → DEFINER-RPC `create_organization`  
2. **A2** `seed_organization_accounts` Authz + REVOKE  
3. **A3** Composite FKs / Org-Trigger  
4. **A5** Rollen-Constraints beim Member-Insert  
5. **A4** Line-Policies an `booked_at` koppeln  
6. Echte Booking-RPCs; Direct INSERT auf Journal/Payments/Sequences für Clients stark einschränken  
7. Teacher-Rechte verschärfen (Produktentscheid)  
8. Negativbestand-Policy entscheiden  
9. `security_checks.sql` um Bootstrap-/Grant-/Org-FK-Fälle erweitern und gegen Review-DB laufen lassen  

---

## Deploy-Empfehlung (ausführlich)

| Szenario | Freigabe? |
|----------|-----------|
| Production / Schulbetrieb mit Auth + Client-Writes | **Nein** |
| Review-DB mit echten Test-Usern über API | **Nein** (A1/A2/A3 greifen) |
| Rein interne Schema-Sicht ohne `authenticated`-Traffic | Formal möglich, aber **nicht empfohlen** bis A1–A3 gefixt — falsches Signal „deployed = ok“ |
| Status quo: nur Repo-SQL, App localStorage | **Ja** (bereits so; kein DB-Deploy nötig) |

**Finale Empfehlung: Deployment noch nicht freigeben.**  
Begründung: mindestens drei aus dem SQL bestätigte kritische/hoch schwere Mängel (Owner-Bootstrap unter RLS, DEFINER-Seed ohne Authz, fehlende Org-Kopplung an FKs) plus fehlende serverseitige Buchungsintegrität bei gleichzeitig offenen Writer-Policies. Nach Fix-Migration + Ausführung von erweiterten `security_checks` inkl. Cross-Org-Smoke auf **nordlicht-handels** (nie TrueFuel) erneut auditieren.
