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

### Buchhaltung, Verkauf, Einkauf, Berichte & Persistenz

- Gemeinsame Journal-Datenquelle (`AccountingProvider` + Workspace-`localStorage` v3)
- Verkauf: Kunden, Produkte, Ausgangsrechnungen (Entwurf → buchen → Zahlungen)
- Einkauf: Lieferanten, Bestellungen, Wareneingang, Eingangsrechnungen, Zahlungsausgänge
- Berichte: SuSa, Kontenblatt, GuV, Bilanz, offene Posten — nur aus Journal/Belegen
- Buchungen nur über zentrales Journal (Forderungen/Verbindlichkeiten, USt/VSt, Bank)
- Gemeinsamer Produktkatalog; Bestand aus Bewegungen (WE +, Verkauf −)
- Speichern/Laden inkl. Verkauf + Einkauf; Reset auf Demo in der Buchhaltung
- Dashboard: Journal-Kennzahlen aus derselben Quelle; YTD-Grafik bleibt separate Demo


## Struktur

```
src/
  accounting/   # Journal, Persistenz, AccountingProvider
  components/   # UI (Buchhaltung, Verkauf, Einkauf, Berichte, …)
  data/         # Demo-Daten
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
| Lager          | Verweis auf Produkte/Bestände im Einkauf    |
| Kontakte       | Platzhalter                                 |
| Berichte       | SuSa, Kontenblatt, GuV, Bilanz, offene Posten|
| Einstellungen  | Platzhalter                                 |

Alle Demo-Daten sind in der UI klar gekennzeichnet. Es gibt keine echte Buchhaltung und keine Datenbank.

## Hinweise

- Lokal ohne Backend lauffähig
- Keine Secrets / API-Keys im Repo
- Supabase später vorgesehen (`supabase/`), derzeit nicht angebunden
