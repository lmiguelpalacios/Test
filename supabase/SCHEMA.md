# Nordlicht Schema v1 (lokal, gehärtet, nicht deployt)

**Stand:** 2026-10-12 · Branch `cursor/uebungsunternehmen-frontend-6a56` / PR #1  
**Status:** SQL nur im Repo. **Kein** Remote-Deploy. App unverändert (localStorage).  
**Security:** siehe `docs/supabase-security-audit.md` + `docs/supabase-security-remediation.md`

---

## Dateien

| Pfad | Inhalt |
|------|--------|
| `migrations/20261012120000_nordlicht_schema_v1.sql` | Schema, composite FKs, Triggers, Seeds, `create_organization` / `seed_organization_accounts` |
| `migrations/20261012120100_nordlicht_rls_v1.sql` | Helpers + RLS (Teacher least privilege) |
| `sql/rpc_booking_stubs.sql` | RPC-Stubs mit Authz (raise) — **keine** Migration |
| `sql/security_checks.sql` | Prüfabfragen für isolierte Review-DB |
| Store-Spiegel | `/cursor/stores/self/docs/supabase-schema-v1.md` |

**Migrations-Entscheidung:** In-place gehärtet, weil v1 **nie** auf nordlicht-handels / TrueFuel / Prod angewendet wurde.

---

## Bootstrap & Rollen

- Org-Anlage **nur** über `create_organization(name, slug)` (atomar: Org + Owner + Seed).  
- Kein RLS-`NOT EXISTS`-Bootstrap mehr.  
- `can_write_org` = **owner | student** (Teacher schreibt keine Buchhaltung).  
- Teacher: Org lesen, Lernfortschritt Klasse lesen, Member `student|viewer` anlegen — **kein** Owner-Grant.  
- Viewer: read-only.

---

## Mandantentrennung

Composite FKs `(organization_id, …_id)` → `unique (organization_id, id)` auf Parents (Kunden, Produkte, Belege, Journal, …).

---

## Buchungsintegrität (DB)

| Regel | Mechanismus |
|-------|-------------|
| `gross = net + tax` | CHECK auf `journal_entries` |
| Soll = Haben | Deferred constraint trigger auf `journal_lines` |
| Doppelbuchung AR/ER | Unique partial index auf `document_journal_links`; `booked_at` nur via künftiger DEFINER-RPC (Client-UPDATE verlangt `booked_at is null`) |
| Gebuchte Lines | RLS + BEFORE-Trigger |
| Zahlung nur gebucht / kein Overpay | BEFORE-Trigger auf Payments |
| Sequenzen | Kein Client-UPDATE-Policy; RPC `next_document_number` (Stub) |

**Korrektur gebuchter Belege:** nicht vorgesehen in v1 — später explizite Storno-/Korrektur-RPC (dokumentiert in Remediation).

---

## Lager

Negativbestand **erlaubt** (wie Client heute). Kein Summen-Constraint vor erstem Write-Path. Entscheidung in Remediation festhalten; bei Bedarf später RPC `record_goods_receipt` / Verkauf.

---

## RPC-Plan (Stubs)

Authz in Stubs vorhanden; Bodies werfen `STUB`. Echte Implementierung = spätere Migration — nicht unüberlegt Stubs „fertig“ melden.

---

## Vor Review-DB (nicht Prod)

1. Nur isolierte DB / nordlicht-handels **ohne** echte Schülerdaten  
2. Migrationen manuell  
3. `sql/security_checks.sql` + Szenarien 2a–2l  
4. **Kein** automatisches Freigabe-Deploy aus diesem Schritt  
