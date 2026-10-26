# Geführtes Abschluss-Training

Stand: 2026-10-26. Route: `/berichte/abschluss` (Berichte → **Abschluss üben**).

„Abschluss üben“ liest das Journal der aktuellen Organisation (`useAccounting`), in derselben Reihenfolge wie die Buchhaltung. Es gibt keine Sortieraufgabe und keinen erfundenen Ersatzfall. Eine leere Firma verweist auf die Buchhaltung.

Schritte, jeder für sich geprüft: **Eröffnung** nur, wenn eine Buchung Konto 800 enthält; danach **ein Schritt je Beleg** (Soll, Haben, Saldo nur dieses Belegs); dann **Abschluss** (802, 335, 801), **GuV** und **Schlussbilanz** aus denselben Salden. Öffnen ist nicht Korrekt. Eine Korrektur an einem Vorgang nimmt nur Abschluss, GuV und Schlussbilanz zurück.

Umsatzsteuer folgt `organizations.vat_enabled` bzw. dem lokalen Workspace-Flag. Aus: keine 260/480, Brutto auf dem Aufwands- oder Ertragskonto. An: die Steuerzeilen der Buchung bleiben. Der Schalter wird nicht überschrieben.

Fortschritt: `localStorage` `nordlicht.abschluss-training.v1`, Fall-Id `journal-ueben`. Zurücksetzen löscht nur diesen Stand.

Der Nordlicht-2026-Fall bleibt als Lernmodus-Aufgabe **Alles auf einmal** (`lt-15`), mit eigener 19-%-Story und ohne Sortierliste.

Keine Datenbankmigration.

## Was gebaut ist

Ein Fall, **Nordlicht Handels — Abschluss 2026**, ersetzt die leere Übungsfläche nicht durch eine zweite Buchhaltung. Das bisherige freie Studio (T-Konten, Bilanz, GuV gegen das Live-Journal) bleibt über **Freies Studio** erreichbar. Lernmodus und lokaler Workspace bleiben unverändert.

Die Checkliste steht links, die Arbeit rechts. Unter 800 px ist die Checkliste eingeklappt und über **Schritte** zu öffnen. Status: Offen, In Bearbeitung, Fehlerhaft, Korrekt, Übersprungen. Zusätzlich sichtbar: ungesehen, gesehen, begonnen, falsch, richtig. Eine Phase zu öffnen setzt sie auf In Bearbeitung, nicht auf Korrekt. B bis F sind gesperrt, bis die vorherige Phase Korrekt ist; der Sperrgrund steht an der Phase. G ist die Kontrolle und immer lesbar. Phasenwechsel behält die Eingaben. Ein früherer Eingriff nimmt späteren Phasen den Status Korrekt, die Entwürfe bleiben. **Überspringen** schaltet die nächste Phase nicht frei.

Hinweise in vier Stufen: allgemein, Kontenklasse, Prinzip, Musterlösung. Die Musterlösung öffnet nach einem Fehlversuch plus Prinzip-Hinweis oder wenn die Phase Korrekt ist.

## Annahmen des Falls

- **Kontenrahmen:** Schulkontenrahmen Industrie. Warenaufwand ist **608 Aufwendungen für Handelswaren**. Vorsteuer **260**, Umsatzsteuer **480** (7 % und 19 %, hier nur 19 %). Eröffnung **800**, Schlussbilanz **801**, GuV **802**, Bilanzergebnis **335**, Eigenkapital **300**, Handelswaren **221**, Forderungen **240**, Verbindlichkeiten **44**, Bank **280**, Kasse **282**, Miete **670**, Zinsen **571**, Umsatzerlöse Handelswaren **501**.
- **Umsatzsteuer:** Fallregel, nicht der Schalter `organizations.vat_enabled`. 19 % auf Wareneinkauf (Ostsee GmbH, ER-1044, 5.000,00 € netto), Warenverkauf (Hafen AG, AR-220, 12.000,00 € netto) und Miete (Kontor Vermietung, 1.200,00 € netto). Habenzinsen 80,00 € ohne Steuer. Der Fall liest und schreibt den Schalter nicht. Neue Buchungen im übrigen Programm folgen dem Schalter weiter.
- **Wareneinsatz (Aufwandsmethode, kein Doppelzählen):** Der Einkauf geht auf 608, nicht auf 221 und nicht auf ein Wareneingangskonto. Am 31.12. wird der Anfangsbestand 8.000,00 € von 221 nach 608 umgebucht, der Inventurbestand 6.000,00 € von 608 nach 221 aktiviert. Wareneinsatz = 8.000 + 5.000 − 6.000 = **7.000,00 €**. 221 endet bei **6.000,00 €**.
- **Abschluss:** Erfolgskonten über 802, Saldo auf 335 (Gewinn: 802 an 335; Verlust wäre die Gegenbuchung), Bestandskonten über 801. Die Schlussbilanz verlangt die richtige Seite je Konto. Gleiche Summen mit vertauschten Konten gelten nicht. Das Ergebnis steht im Eigenkapital auf 335, nicht nur als Ausgleichsposten.

Eröffnung 01.01.2026 über 800: Geschäftsausstattung 10.000, Forderungen 2.380, Bank 15.000, Kasse 500, Verbindlichkeiten 3.570, Eigenkapital als Rest. Zahlungen: Hafen AG und Ostsee GmbH jeweils brutto per Bank.

Aus dem Journal abgeleitet (nicht als zweite Tabelle gepflegt): Gewinn **3.880,00 €**, Bilanzsumme **42.040,00 €**, Bilanz ausgeglichen, Periodenergebnis nach den Abschlussbuchungen 0, weil es auf 335 liegt.

## Datenfluss

1. Vorfälle in `src/abschluss/training/nordlichtCase.ts` (Beträge, Parteien, Belege, Buchungsregel).
2. Einfache Buchungen laufen durch `validateJournalEntry` (`vatEnabled: true` nur für diesen Fall). Zusammengesetzte Buchungen (Eröffnung) durch dieselbe Cent-Prüfung und den Kontenplan (`postEntry.ts`).
3. `solveTrainingCase` baut das Journal und daraus T-Konten, Abschlussbuchungen, `buildIncomeStatement` und `buildBalanceSheet`.
4. Die Prüfung vergleicht die Eingabe mit diesem Ableitungsergebnis. Eine geänderte frühere Buchung ändert den Fingerabdruck und setzt C–G zurück auf In Bearbeitung.

Fortschritt: `localStorage`-Schlüssel `nordlicht.abschluss-training.v1`, pro `caseId`. **Fall zurücksetzen** löscht nur diesen Fall. `nordlicht.uebungsunternehmen.journal.v1` und andere Fälle bleiben. Es gibt keinen Schreibweg nach Supabase (`learning_progress`, Org, RPC).

## Tests

| Lauf | Ergebnis |
|------|----------|
| `npm test` | **105/105** (23 Dateien) |
| davon `src/abschluss/training/training.test.ts` | **20/20** |
| `npm run typecheck` | bestanden |
| `npm run lint` (`oxlint`) | Exit 0, nur bestehende Warnungen |
| `npm run build` | bestanden |

Die 20 Prüfungen: Reihenfolge und IDs, richtige/falsche Buchung, Soll/Haben, Betrag, fehlende Zeile, zusammengesetzte Buchung, T-Konten gegen das Journal, Salden inkl. 608/221/260/480, Abschlussbuchungen inkl. Hinweis bei fehlendem Ausgleich, GuV aus `buildIncomeStatement`, Gewinn/Verlust, Bilanzzuordnung inkl. 335 und 801, ausgeglichene aber falsch zugeordnete Bilanz, Invalidierung nach früherer Änderung, Reload, Falltrennung ohne Workspace-Daten zu löschen, Abschluss nur nach Prüfungen, Öffnen ist nicht Korrekt, Rechnung ohne Supabase, kein Supabase-Schreibzugriff.

## Grenzen

- Ein Fall. Weitere Fälle brauchen eine eigene `TrainingCase`-Id, sonst vermischen sich die Stände nicht, aber die UI zeigt nur Nordlicht 2026.
- Fortschritt nur lokal. Online-Modus speichert diesen Fall nicht in Supabase; RLS wird nicht umgangen, es gibt keine neue Migration für den Fortschritt.
- Die Datei `supabase/migrations/20261024101500_kontenplan_fibu.sql` liegt im Branch, weil der Schulkontenrahmen dafür im Code nötig ist. Sie wurde **nicht** angewendet.
- Umsatzsteuer des Falls ist fest 19 % auf den genannten Belegen und folgt nicht dem Einstellungs-Schalter.
- Kein Cloudflare-, DNS- oder Pages-Deploy.
