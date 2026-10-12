# Supabase (vorbereitet, noch nicht angebunden)

Die Anwendung läuft weiter vollständig lokal (Demo-Daten / localStorage).  
In diesem Ordner liegen **nur Repo-Artefakte** — keine Credentials, kein Client, kein Remote-Deploy.

## Harte Grenzen

- **Nicht** ausführen: `apply_migration`, `execute_sql`, ungeprüftes Dashboard-Apply
- **Nicht** anfassen: TrueFuel; kein automatisches Deploy auf `nordlicht-handels`
- **Keine** React-/Persistenz-/Business-Logic-Änderungen in diesem Ordner
- Security-Remediation ist **lokal** — Deploy weiterhin **nicht** freigegeben

## Inhalt

| Pfad | Zweck |
|------|--------|
| `migrations/20261012120000_nordlicht_schema_v1.sql` | Schema v1 gehärtet (composite FKs, Triggers, `create_organization`) |
| `migrations/20261012120100_nordlicht_rls_v1.sql` | RLS + Teacher least privilege |
| `sql/rpc_booking_stubs.sql` | RPC-Stubs mit Authz (raise) |
| `sql/security_checks.sql` | Checks für isolierte Review-DB |
| `SCHEMA.md` | Tabellen, Rollen, Integrität |

## Docs

- Repo: `docs/supabase-security-audit.md`, `docs/supabase-security-remediation.md`
- Store: `docs/supabase-architektur.md`, `docs/supabase-implementierungsplan.md`, Spiegel der Schema-/Security-Docs

## Nächster Schritt (außerhalb dieses Auftrags)

1. Isolierte Review-DB + `security_checks.sql`  
2. Echte Booking-RPC-Bodies  
3. Erst dann erneutes Deploy-Sign-off — **nicht** automatisch  
