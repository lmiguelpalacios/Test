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
| `migrations/20261013140000_nordlicht_grants_v1.sql` | Least-privilege grants |
| `migrations/20261013140100_nordlicht_booking_rpcs_v1.sql` | Kern-Booking-/Payment-RPCs |
| `migrations/20261014100000_nordlicht_payment_idempotency_v1.sql` | Unique natural-key indexes (ZE/ZA); lokal / später Review |
| `migrations/20261014120000_nordlicht_app_rpcs_v1.sql` | `record_goods_receipt` + `import_workspace` (app dual-mode) |
| `sql/rpc_booking_stubs.sql` | verbleibender Stub: `post_learning_practice` |
| `sql/security_checks.sql` | Checks für isolierte Review-DB |
| `SCHEMA.md` | Tabellen, Rollen, Integrität |

## Docs

- Repo: `docs/supabase-security-audit.md`, `docs/supabase-security-remediation.md`, `docs/supabase-payment-idempotency.md`
- Store: `docs/supabase-architektur.md`, `docs/supabase-implementierungsplan.md`, Spiegel der Schema-/Security-/Idempotenz-Docs

## Lokale Review-DB (isoliert)

```bash
./supabase/sql/local_review/run_local_review.sh
```

Voraussetzung: lokales PostgreSQL (kein Docker/Supabase CLI nötig).  
Ergebnisse: `docs/supabase-review-results.md`, Rohdaten unter `sql/local_review/out/`.  
**Kein** Remote-Deploy.

## Nächster Schritt (außerhalb dieses Auftrags)

1. Echte Booking-RPC-Bodies  
2. Optional: gleiche Checks auf isolierter Supabase-Review-Instanz (nicht Prod)  
3. Erst dann erneutes Deploy-Sign-off — **nicht** automatisch  
