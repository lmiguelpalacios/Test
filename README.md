# Übungsunternehmen — Nordlicht Handels GmbH

Professionelle Webanwendung für ein virtuelles Übungsunternehmen (kaufmännische Ausbildung).  
Aktueller Stand: Frontend-Grundgerüst mit Dashboard (Demo-Daten) und navigierbaren Platzhalter-Bereichen.

## Stack

- React + Vite + TypeScript
- Lucide React (Icons)
- React Router (Navigation)
- npm

## Start

```bash
npm install
npm run dev
```

Produktion / Cloudflare Pages–tauglicher Build:

```bash
npm run build
npm run preview
```

Typecheck / Tests:

```bash
npm run typecheck
npm test
```

### Buchhaltung, Verkauf & Persistenz

- Gemeinsame Journal-Datenquelle (`AccountingProvider` + Workspace-`localStorage` v2)
- Verkauf: Kunden, Produkte, Ausgangsrechnungen (Entwurf → buchen → Zahlungen)
- Rechnungsbuchung ins zentrale Journal (1400 / Erlöse / USt); Zahlungen Bank↔1400
- Speichern/Laden inkl. Verkaufsdaten; Reset auf Demo in der Buchhaltung
- Dashboard: Journal-Kennzahlen aus derselben Quelle; YTD-Grafik bleibt separate Demo


## Struktur

```
src/
  components/   # wiederverwendbare UI (KPI, Chart, Aktivitäten, …)
  data/         # Demo-Daten
  layout/       # Sidebar, Topbar, App-Layout
  lib/          # Formatierung
  pages/        # Seiten je Bereich
  types/        # TypeScript-Typen
supabase/       # Stub für spätere Backend-Anbindung (nicht aktiv)
```

## Bereiche

| Bereich        | Status                                      |
|----------------|---------------------------------------------|
| Dashboard      | Demo-Kennzahlen, Grafik, Aktivitäten        |
| Buchhaltung    | Übersicht, Kontenplan, Buchungserfassung    |
| Verkauf        | Kunden, Produkte, Rechnungen, Zahlungen     |
| Einkauf        | Platzhalter                                 |
| Lager          | Platzhalter                                 |
| Kontakte       | Platzhalter                                 |
| Berichte       | Platzhalter                                 |
| Einstellungen  | Platzhalter                                 |

Alle Demo-Daten sind in der UI klar gekennzeichnet. Es gibt keine echte Buchhaltung und keine Datenbank.

## Hinweise

- Lokal ohne Backend lauffähig
- Keine Secrets / API-Keys im Repo
- Supabase später vorgesehen (`supabase/`), derzeit nicht angebunden
