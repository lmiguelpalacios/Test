# Supabase (vorbereitet, noch nicht implementiert)

Dieser Ordner ist ein Platzhalter für die spätere Backend-Anbindung
(Authentifizierung, Unternehmen, Buchungsdaten).

Aktuell läuft die Anwendung vollständig lokal mit Demo-Daten im Frontend —
ohne Supabase-Client, ohne Credentials und ohne API-Aufrufe.

## Architekturbericht (Vorbereitung Mehrbenutzer)

Der konkrete Vorschlag (Schema, RLS, Migration Workspace v4 → DB, Risiken,
Implementierungsreihenfolge) liegt im Agent-Store:

`docs/supabase-architektur.md` (Cursor Project Store)

In diesem Schritt:

- **keine** Auth-UI
- **keine** ausgeführten DB-Migrationen
- **keine** Live-Anbindung / keine Env-Secrets

Spätere SQL-Migrationen können hier unter `migrations/` ergänzt werden, sobald
die Reihenfolge aus dem Architekturbericht umgesetzt wird.
