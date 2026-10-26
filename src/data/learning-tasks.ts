import {
  balanceSheetSolutionDraft,
  evaluateBalanceSheet,
} from '../abschluss/evaluateBalanceSheet'
import { evaluateTAccounts } from '../abschluss/evaluateTAccounts'
import { expectedTAccountsAsDraft } from '../abschluss/expectedBalances'
import type { LearningState, LearningTask } from '../types/learning'
import { abschlussFixtureJournal } from './abschluss-learning-fixtures'

const FIXTURE_AS_OF = '2026-10-02'

const fixtureTAccountsMaxPoints = evaluateTAccounts(
  abschlussFixtureJournal,
  FIXTURE_AS_OF,
  expectedTAccountsAsDraft(abschlussFixtureJournal, FIXTURE_AS_OF),
).maxPoints

const fixtureBilanzMaxPoints = evaluateBalanceSheet(
  abschlussFixtureJournal,
  FIXTURE_AS_OF,
  balanceSheetSolutionDraft(abschlussFixtureJournal, FIXTURE_AS_OF),
).maxPoints

/**
 * Demo-Lernaufgaben für Nordlicht Handels GmbH.
 * Musterlösungen sind Lerninhalte — keine automatischen Journalbuchungen.
 */
export const learningTasks: LearningTask[] = [
  {
    id: 'lt-01',
    number: 1,
    title: 'Aktiv oder Passiv? Banküberweisung eingehend',
    topic: 'aktiv_passiv',
    difficulty: 'leicht',
    kind: 'booking',
    scenario:
      'Ein Kunde überweist 500,00 € netto ohne USt auf das Bankkonto der Nordlicht Handels GmbH als Anzahlung auf eine spätere Lieferung. Buche den Zahlungseingang gegen erhaltene Anzahlungen (43).',
    solution: {
      debitAccount: '280',
      creditAccount: '43',
      netAmountCents: 50_000,
      vatRate: 0,
    },
    explanation:
      'Die Bank (Aktivkonto) nimmt im Soll zu. Gleichzeitig entsteht eine Verbindlichkeit (Passiv) im Haben. Ohne USt bleibt der Betrag brutto = netto.',
    effects: {
      assets: 'Bank (280) steigt',
      liabilities: 'Erhaltene Anzahlungen (43) steigen',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-02',
    number: 2,
    title: 'Soll und Haben bei Aufwand',
    topic: 'soll_haben',
    difficulty: 'leicht',
    kind: 'booking',
    scenario:
      'Nordlicht zahlt Büromiete 1.200,00 € netto zuzüglich 19 % USt per Bank. Welches Konto gehört ins Soll, welches ins Haben?',
    solution: {
      debitAccount: '670',
      creditAccount: '280',
      netAmountCents: 1_200_00,
      vatRate: 19,
    },
    explanation:
      'Aufwandskonto Mieten, Pachten (670) wird im Soll bebucht; die Bank (280) mindert im Haben. Die Vorsteuer (260) entsteht automatisch über die USt-Logik des Lernjournals.',
    effects: {
      assets: 'Bank sinkt; Vorsteuer steigt',
      result: 'Aufwand steigt → Periodenergebnis sinkt',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-03',
    number: 3,
    title: 'Einfacher Geschäftsvorfall: Barkauf Bürobedarf',
    topic: 'geschaeftsvorfall',
    difficulty: 'leicht',
    kind: 'booking',
    scenario:
      'Barzahlung für Bürobedarf: 80,00 € netto + 19 % USt aus der Kasse.',
    solution: {
      debitAccount: '680',
      creditAccount: '282',
      netAmountCents: 8_000,
      vatRate: 19,
    },
    explanation:
      'Büromaterial (680) im Soll, Kasse (282) im Haben. Mit 19 % entsteht abziehbare Vorsteuer auf 260.',
    effects: {
      assets: 'Kasse sinkt; Vorsteuer steigt',
      result: 'Aufwand erhöht',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-04',
    number: 4,
    title: 'Wareneinkauf auf Rechnung',
    topic: 'wareneinkauf',
    difficulty: 'mittel',
    kind: 'booking',
    scenario:
      'Wareneinkauf bei Ostsee Papier & Pack: 1.000,00 € netto, 19 % Vorsteuer, Zahlung später (Verbindlichkeiten).',
    solution: {
      debitAccount: '608',
      creditAccount: '44',
      netAmountCents: 1_00_000,
      vatRate: 19,
    },
    explanation:
      'Aufwendungen für Handelswaren (608) im Soll, Verbindlichkeiten L+L (44) im Haben über Brutto. Der Kontenplan trennt den Steuersatz nicht auf eigene Wareneingangskonten. Aufwand entsteht mit der Rechnung — nicht erst bei Zahlung oder physischem Wareneingang. Vorsteuer 19 % geht auf 260.',
    effects: {
      assets: 'Vorsteuer steigt',
      liabilities: 'Verbindlichkeiten steigen',
      result: 'Aufwand Wareneinkauf steigt',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-05',
    number: 5,
    title: 'Zahlung einer Lieferantenrechnung',
    topic: 'zahlung_lieferant',
    difficulty: 'mittel',
    kind: 'booking',
    scenario:
      'Begleichung einer bereits gebuchten Eingangsrechnung: 1.190,00 € brutto (entspricht 1.000 € netto + 19 %) per Bank. Keine erneute Aufwandbuchung.',
    solution: {
      debitAccount: '44',
      creditAccount: '280',
      netAmountCents: 1_190_00,
      vatRate: 0,
    },
    explanation:
      'Verbindlichkeiten mindern im Soll, Bank im Haben. USt-Satz 0 %, weil die Steuer schon bei der Eingangsrechnung erfasst wurde — der Zahlungsbetrag ist der Bruttobetrag.',
    effects: {
      assets: 'Bank sinkt',
      liabilities: 'Verbindlichkeiten sinken',
      result: 'kein erneuter Aufwand',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-06',
    number: 6,
    title: 'Warenverkauf auf Rechnung',
    topic: 'warenverkauf',
    difficulty: 'mittel',
    kind: 'booking',
    scenario:
      'Ausgangsrechnung an Küstenküche AG: 2.000,00 € netto Erlöse 19 %, Forderung entsteht.',
    solution: {
      debitAccount: '240',
      creditAccount: '501',
      netAmountCents: 2_00_000,
      vatRate: 19,
    },
    explanation:
      'Forderungen (240) im Soll über Brutto, Umsatzerlöse für Handelswaren (501) im Haben über Netto. Umsatzsteuer 19 % wird auf Konto 480 ergänzt.',
    effects: {
      assets: 'Forderungen steigen',
      result: 'Erlöse steigen → Periodenergebnis steigt',
      liabilities: 'Umsatzsteuerverbindlichkeit steigt',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-07',
    number: 7,
    title: 'Zahlungseingang vom Kunden',
    topic: 'zahlung_kunde',
    difficulty: 'mittel',
    kind: 'booking',
    scenario:
      'Kunde überweist 2.380,00 € brutto auf die Bank zur Begleichung einer gebuchten Ausgangsrechnung (2.000 € + 19 %).',
    solution: {
      debitAccount: '280',
      creditAccount: '240',
      netAmountCents: 2_380_00,
      vatRate: 0,
    },
    explanation:
      'Bank im Soll, Forderungen im Haben. Keine erneute Erlös-/USt-Buchung — die Forderung wird nur ausgeglichen.',
    effects: {
      assets: 'Bank steigt, Forderungen sinken (Aktivtausch)',
      result: 'unverändert',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-08',
    number: 8,
    title: 'Vorsteuer bei Einkauf 7 %',
    topic: 'ust_vst',
    difficulty: 'mittel',
    kind: 'booking',
    scenario:
      'Einkauf Bio-Gewürze: 500,00 € netto zum ermäßigten Satz 7 %, auf Rechnung (Verbindlichkeiten).',
    solution: {
      debitAccount: '608',
      creditAccount: '44',
      netAmountCents: 50_000,
      vatRate: 7,
    },
    explanation:
      'Aufwendungen für Handelswaren (608) im Soll, Verbindlichkeiten (44) im Haben. Es gibt kein eigenes 7-%-Wareneingangskonto. Vorsteuer 260 wird vom Journal bei USt 7 % ergänzt — nicht manuell als Primärkonto gewählt.',
    effects: {
      assets: 'Vorsteuer (260) steigt',
      liabilities: 'Verbindlichkeiten steigen',
      result: 'Aufwand steigt',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-09',
    number: 9,
    title: 'Umsatzsteuer bei Verkauf 7 %',
    topic: 'ust_vst',
    difficulty: 'mittel',
    kind: 'booking',
    scenario:
      'Verkauf ermäßigt besteuerter Ware: 300,00 € netto, 7 % USt, auf Ziel (Forderung).',
    solution: {
      debitAccount: '240',
      creditAccount: '501',
      netAmountCents: 30_000,
      vatRate: 7,
    },
    explanation:
      'Umsatzerlöse für Handelswaren liegen auf Konto 501, auch bei 7 %. Forderung (240) im Soll (Brutto), Umsatzsteuer 480 ergänzt das Journal automatisch.',
    effects: {
      assets: 'Forderungen steigen',
      liabilities: 'Umsatzsteuer steigt',
      result: 'Erlöse steigen',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-10',
    number: 10,
    title: 'Wirkung auf GuV: Energie und Treibstoffe',
    topic: 'bilanz_guv',
    difficulty: 'schwer',
    kind: 'booking',
    scenario:
      'Sofortzahlung für Energie und Treibstoffe 250,00 € netto + 19 % USt per Bank (Konto 605). Welche Buchung erfasst den Aufwand korrekt?',
    solution: {
      debitAccount: '605',
      creditAccount: '280',
      netAmountCents: 25_000,
      vatRate: 19,
    },
    explanation:
      'Aufwand mindert das Periodenergebnis (GuV). In der Bilanz sinkt die Bank; die Vorsteuer erhöht die Aktiva. Ohne Eröffnungsbilanz zeigt die Lernbilanz das Periodenergebnis als Ausgleich.',
    effects: {
      assets: 'Bank −, Vorsteuer +',
      result: 'GuV-Aufwand → Periodenergebnis −',
      equity: 'indirekt über Periodenergebnis',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-11',
    number: 11,
    title: 'Aktivtausch ohne GuV-Wirkung',
    topic: 'bilanz_guv',
    difficulty: 'schwer',
    kind: 'booking',
    scenario:
      'Privatdarlehen wird ausgezahlt: 5.000,00 € gehen auf das Bankkonto (Passivzuwachs und Aktivzuwachs). Ohne USt.',
    solution: {
      debitAccount: '280',
      creditAccount: '489',
      netAmountCents: 5_00_000,
      vatRate: 0,
    },
    explanation:
      'Bank und sonstige Verbindlichkeiten steigen gleichermaßen — Bilanzverlängerung ohne Erfolgswirkung. Kein Aufwand, kein Ertrag.',
    effects: {
      assets: 'Bank steigt',
      liabilities: 'Sonstige Verbindlichkeiten (489) steigen',
      result: 'keine GuV-Wirkung',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-12',
    number: 12,
    title: 'Reparatur auf Rechnung',
    topic: 'geschaeftsvorfall',
    difficulty: 'leicht',
    kind: 'booking',
    scenario:
      'Reparatur Werkstatt: 150,00 € netto + 19 % USt, Rechnung noch offen.',
    solution: {
      debitAccount: '613',
      creditAccount: '44',
      netAmountCents: 15_000,
      vatRate: 19,
    },
    explanation:
      'Reparaturaufwand im Soll, Verbindlichkeiten im Haben. Typischer erfolgswirksamer Vorfall mit Vorsteuer.',
    effects: {
      assets: 'Vorsteuer steigt',
      liabilities: 'Verbindlichkeiten steigen',
      result: 'Aufwand steigt',
    },
    maxPoints: 4,
    allowPracticeJournalPost: true,
  },
  {
    id: 'lt-13',
    number: 13,
    title: 'T-Konten aus Mini-Journal',
    topic: 'bilanz_guv',
    difficulty: 'mittel',
    kind: 't_accounts',
    scenario:
      'Im Übungsjournal stehen zwei Buchungen: Warenverkauf 1.000,00 € netto + 19 % USt auf Ziel (Forderungen an Erlöse) und Büromiete 500,00 € netto + 19 % USt per Bank. Stelle die T-Konten mit Endsaldo auf der richtigen Seite auf (nur Konten mit Saldo ≠ 0).',
    explanation:
      'Aus den Journalzeilen ergeben sich Salden für Forderungen, Erlöse, USt, Miete, Vorsteuer und Bank. Aktiv-/Aufwandssalden typischerweise Soll, Passiv-/Ertragssalden Haben — Betrag = |Soll − Haben|.',
    effects: {
      assets: 'Forderungen und Vorsteuer steigen; Bank sinkt',
      liabilities: 'Umsatzsteuer steigt',
      result: 'Erlöse und Miete wirken auf das Periodenergebnis',
    },
    maxPoints: fixtureTAccountsMaxPoints,
    allowPracticeJournalPost: false,
    fixtureEntries: abschlussFixtureJournal,
    asOf: FIXTURE_AS_OF,
  },
  {
    id: 'lt-14',
    number: 14,
    title: 'Bilanz zum Stichtag (Mini-Journal)',
    topic: 'bilanz_guv',
    difficulty: 'mittel',
    kind: 'bilanz',
    scenario:
      'Dasselbe Mini-Journal wie bei den T-Konten. Erstelle die Bilanz zum 02.10.2026: Aktivzeilen, Passivzeilen, Periodenergebnis und Summen. Keine Nullkonten — Extra-Zeilen zählen als Fehler.',
    explanation:
      'Die Bilanz zeigt Bestandskonten-Salden bis Stichtag. Das Periodenergebnis kommt aus der GuV (Erträge − Aufwendungen) und schließt die Passivseite ohne GuV-Abschlussbuchung.',
    effects: {
      assets: 'Forderungen, Vorsteuer; Bank negativ bzw. geringer',
      liabilities: 'Umsatzsteuer',
      result: 'Periodenergebnis = Erlöse − Miete (netto-Wirkung über GuV)',
    },
    maxPoints: fixtureBilanzMaxPoints,
    allowPracticeJournalPost: false,
    fixtureEntries: abschlussFixtureJournal,
    asOf: FIXTURE_AS_OF,
  },
  {
    id: 'lt-15',
    number: 15,
    title: 'Alles auf einmal',
    topic: 'bilanz_guv',
    difficulty: 'schwer',
    kind: 'fall',
    scenario:
      'Nordlicht Handels, Jahr 2026, in einem Stück: Eröffnung, Wareneinkauf, Warenverkauf, Zahlungen, Miete mit 19 % Umsatzsteuer, Habenzinsen ohne Steuer, Anfangsbestand und Inventur. Keine Sortierliste. Buche, stelle T-Konten, schließe über GuV und Schlussbilanz ab.',
    explanation:
      'Die Musterlösung entsteht aus denselben Vorfällen über validateJournalEntry und die Report-Builder. 19 % bleibt die Story dieses Falls und folgt nicht dem Schalter der Übung „Abschluss üben“.',
    effects: {
      result: 'Gewinn auf 335, Bestandskonten über 801.',
    },
    maxPoints: 5,
    allowPracticeJournalPost: false,
  },
]

export function createEmptyLearningState(): LearningState {
  return {
    progress: [],
    totalPoints: 0,
  }
}

export function getLearningTaskById(id: string): LearningTask | undefined {
  return learningTasks.find((task) => task.id === id)
}

/** lt-08 / lt-09 (Thema USt/VSt) sind nur sichtbar, wenn Umsatzsteuer an ist. */
export function isVatSettingTask(task: { id: string; topic: string }): boolean {
  return task.topic === 'ust_vst' || task.id === 'lt-08' || task.id === 'lt-09'
}

export function visibleLearningTasks(vatEnabled: boolean): LearningTask[] {
  if (vatEnabled) return learningTasks
  return learningTasks.filter((task) => !isVatSettingTask(task))
}

/** Punkte einer Buchungsaufgabe ohne USt-Kriterium, wenn der Schalter aus ist. */
export function learningTaskMaxPoints(task: LearningTask, vatEnabled: boolean): number {
  if (!vatEnabled && task.kind === 'booking') return Math.max(0, task.maxPoints - 1)
  return task.maxPoints
}

export function computeLearningTotalPoints(
  progress: LearningState['progress'],
): number {
  return progress
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.bestScore, 0)
}
