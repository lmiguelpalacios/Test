# Nordlicht Schema v1 (lokal, nicht deployt)

**Stand:** 2026-10-12 · Branch `cursor/uebungsunternehmen-frontend-6a56` / PR #1  
**Quelle:** Architekturbericht + Workspace-Persistenz v4  
**Status:** SQL nur im Repo. **Kein** `apply_migration` / `execute_sql`. App unverändert (localStorage).

---

## Dateien

| Pfad | Inhalt |
|------|--------|
| `migrations/20261012120000_nordlicht_schema_v1.sql` | Tabellen, Seeds (Kontenvorlage, Lernaufgaben-Platzhalter), `seed_organization_accounts` |
| `migrations/20261012120100_nordlicht_rls_v1.sql` | SECURITY DEFINER Helpers + RLS Policies |
| `sql/rpc_booking_stubs.sql` | RPC-Stubs (raise only) — **keine** Migration |
| `sql/security_checks.sql` | Prüfabfragen nach manuellem Deploy |
| Store-Spiegel | `/cursor/stores/self/docs/supabase-schema-v1.md` |

---

## Datenklassen

1. **Org-Daten** (`organization_id`): Konten, Kontakte, Produkte, Verkauf/Einkauf, Bestand, Journal, Sequenzen, Import-Batches  
2. **Persönlich + Org:** `learning_progress` (`user_id` + `organization_id`)  
3. **Global (read für authenticated):** `account_templates`, `learning_tasks`  

`legacy_id` (org-scoped unique, nullable) trägt Client-IDs beim späteren Import.

---

## Tabellen (Kurz)

```
profiles ← auth.users
organizations
organization_members (role: owner|teacher|student|viewer)

account_templates (global) → accounts (je Org)
customers / suppliers / products

sales_invoices → sales_invoice_lines
sales_payments → journal_entries?

purchase_orders → purchase_order_lines
goods_receipts → goods_receipt_lines
vendor_invoices → vendor_invoice_lines
vendor_payments → journal_entries?
stock_movements

journal_entries → journal_lines
document_journal_links (ersetzt journalEntryIds[])
document_sequences (kind → next_value)

learning_tasks (global)
learning_progress (user_id, organization_id, task_id)
import_batches (organization_id, content_hash)
```

Geldbeträge: Integer-Cent. USt: `0|7|19`.

---

## Rollen & Schreibrechte

| Rolle | Org lesen | Belege/Journal schreiben | Lernfortschritt anderer | Catalog write |
|-------|-----------|--------------------------|-------------------------|---------------|
| owner | ja | ja (`can_write_org`) | ja (SELECT) | nein |
| teacher | ja | ja | ja (SELECT) | nein |
| student | ja | ja | nein (nur eigener) | nein |
| viewer | ja | nein | nein | nein |

`can_write_org` = owner | teacher | student.  
Löschen kritischer Stammdaten/gebuchter Belege oft nur owner/teacher.  
Gebuchte AR/ER: Update/Delete nur wenn `booked_at is null`.

---

## RLS-Prinzip

- Helpers `is_org_member`, `has_org_role`, `can_write_org` sind **SECURITY DEFINER** mit `search_path = public` → keine rekursiven Policies auf `organization_members`.
- Auto-RLS beim Projekt-Anlegen **ersetzt diese Datei nicht**.
- Kein `anon`-Write auf Geschäftstabellen.
- Catalogs: nur SELECT für `authenticated`; Writes nur service_role/Migration.

---

## RPC-Plan (Stubs in `sql/`)

| Funktion | Zweck |
|----------|--------|
| `next_document_number` | atomare Sequenz |
| `book_sales_invoice` / `book_vendor_invoice` | Doppelbuchung / Lock |
| `record_sales_payment` / `record_vendor_payment` | Überzahlung |
| `record_goods_receipt` | aggregierte Restmenge |
| `post_learning_practice` | einmalig nach `completed` |
| `import_workspace` | idempotenter v4-Import |

Stubs werfen bewusst `STUB: …` — Implementierung = spätere Migration.

---

## Offene Entscheidungen

- Teacher-Schreibrecht auf Journal: aktuell wie Student (schreiben erlaubt) — Schule kann einschränken  
- Negativer Bestand: Client erlaubt heute; Server-Policy offen  
- ID-Import: UUID-Remap vs. `legacy_id` behalten  
- Demo-Org-Seed mit Belegen: bewusst **nicht** in v1 (nur Templates + Task-IDs)  
- FORCE RLS / bootstrap-Owner-Policy unter Last testen  

---

## Vor erstem Deploy (Checkliste)

1. Nur Projekt **nordlicht-handels** — nie TrueFuel  
2. Review beider Migrationen + RLS  
3. Manuell anwenden (CLI/Dashboard), **nicht** ungeprüft per MCP  
4. `sql/security_checks.sql` gegen Review-DB  
5. RPC-Stubs optional; echte Bodies erst Phase 4 des Implementierungsplans  
6. App bleibt auf localStorage bis Feature-Flag / Client existiert  
