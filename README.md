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

Optionaler **Supabase-Modus** (sonst lokal/demo): `.env.example` → `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (nur anon). Details: `docs/supabase-integration-progress.md`, Hosting: `docs/supabase-hosting-cloudflare-pages.md`.

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

### Buchhaltung, Verkauf, Einkauf, Berichte, Lernmodus & Persistenz

- Dual-Mode: lokal Workspace-`localStorage` v4 **oder** Supabase (Auth/Org/RPC) — kein stiller Hybrid
- Verkauf / Einkauf / Berichte; online: Buchung/Zahlung über DEFINER-RPCs
- Lernmodus: Bewertung lokal/online; Übungsjournal-Übernahme online noch gesperrt
- Expliziter Workspace-v4-Import-Wizard unter Einstellungen (Supabase/Owner)
- Dashboard: Journal-Kennzahlen; YTD-Grafik bleibt separate Demo


## Struktur

```
src/
  accounting/   # Journal, Persistenz, AccountingProvider
  components/   # UI (…, Berichte, Lernmodus)
  data/         # Demo-Daten inkl. Lernaufgaben
  learning/     # Bewertung Lernantworten
  layout/       # Sidebar, Topbar, App-Layout
  purchase/     # Einkaufslogik
  reports/      # Auswertung aus Journal/Belegen
  sales/        # Verkaufslogik
  pages/        # Seiten je Bereich
  types/        # TypeScript-Typen
supabase/       # Stub — nicht angebunden
```

## Bereiche

| Bereich        | Status                                      |
|----------------|---------------------------------------------|
| Dashboard      | Demo-Kennzahlen, Grafik, Aktivitäten        |
| Buchhaltung    | Übersicht, Kontenplan, Buchungserfassung    |
| Verkauf        | Kunden, Produkte, Rechnungen, Zahlungen     |
| Einkauf        | Lieferanten, Bestellungen, WE, ER, Zahlungen|
| Berichte       | SuSa, Kontenblatt, GuV, Bilanz, offene Posten|
| Lernmodus      | Aufgaben, Bewertung, Fortschritt (lokal)    |
| Einstellungen  | Platzhalter                                 |

Alle Demo-Daten sind in der UI klar gekennzeichnet. Es gibt keine echte Buchhaltung und keine Datenbank.

## Hinweise

- Lokal ohne Backend lauffähig
- Keine Secrets / API-Keys im Repo
- Supabase später vorgesehen (`supabase/`), derzeit nicht angebunden
