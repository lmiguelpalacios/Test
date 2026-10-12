# Supabase (vorbereitet, noch nicht angebunden)

Die Anwendung läuft weiter vollständig lokal (Demo-Daten / localStorage).  
In diesem Ordner liegen **nur Repo-Artefakte** — keine Credentials, kein Client, kein Remote-Deploy.

## Harte Grenzen

- **Nicht** ausführen: `apply_migration`, `execute_sql`, ungeprüftes Dashboard-Apply
- **Nicht** anfassen: TrueFuel; Remote-Änderungen an `nordlicht-handels` nur nach bewusstem Review außerhalb dieses Schritts
- **Keine** React-/Persistenz-/Business-Logic-Änderungen in diesem Ordner

## Inhalt

| Pfad | Zweck |
|------|--------|
| `migrations/20261012120000_nordlicht_schema_v1.sql` | Schema v1 + Seeds |
| `migrations/20261012120100_nordlicht_rls_v1.sql` | RLS Helpers + Policies |
| `sql/rpc_booking_stubs.sql` | RPC-Stubs (werfen absichtlich) |
| `sql/security_checks.sql` | Prüfabfragen nach manuellem Deploy |
| `SCHEMA.md` | Tabellen, Rollen, RLS, offene Entscheidungen |

## Pläne (Agent Store)

- `docs/supabase-architektur.md`
- `docs/supabase-implementierungsplan.md`
- `docs/supabase-schema-v1.md` (Spiegel von `SCHEMA.md`)

## Nächster Schritt (nicht in diesem PR-Schritt)

1. Review der SQL-Dateien  
2. Manuelles Apply nur auf **nordlicht-handels**  
3. `security_checks.sql`  
4. Später: echte RPC-Bodies, dann optional App-Client hinter Feature-Flag  
