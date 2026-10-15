import type { LearningState, LearningTask } from '../types/learning'

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
    scenario:
      'Ein Kunde überweist 500,00 € netto ohne USt auf das Bankkonto der Nordlicht Handels GmbH als Anzahlung auf eine spätere Lieferung. Buche den Zahlungseingang gegen Verbindlichkeiten (erhaltene Anzahlungen vereinfacht über 1600).',
    solution: {
      debitAccount: '1200',
      creditAccount: '1600',
      netAmountCents: 50_000,
      vatRate: 0,
    },
    explanation:
      'Die Bank (Aktivkonto) nimmt im Soll zu. Gleichzeitig entsteht eine Verbindlichkeit (Passiv) im Haben. Ohne USt bleibt der Betrag brutto = netto.',
    effects: {
      assets: 'Bank (1200) steigt',
      liabilities: 'Verbindlichkeiten (1600) steigen',
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
    scenario:
      'Nordlicht zahlt Büromiete 1.200,00 € netto zuzüglich 19 % USt per Bank. Welches Konto gehört ins Soll, welches ins Haben?',
    solution: {
      debitAccount: '4210',
      creditAccount: '1200',
      netAmountCents: 1_200_00,
      vatRate: 19,
    },
    explanation:
      'Aufwandskonto Miete (4210) wird im Soll bebucht; die Bank mindert im Haben. Die Vorsteuer entsteht automatisch über die USt-Logik des Lernjournals (Aufwand + VSt an Bank).',
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
    scenario:
      'Barzahlung für Bürobedarf: 80,00 € netto + 19 % USt aus der Kasse.',
    solution: {
      debitAccount: '4920',
      creditAccount: '1000',
      netAmountCents: 8_000,
      vatRate: 19,
    },
    explanation:
      'Bürobedarf (Aufwand) im Soll, Kasse (Aktiv) im Haben. Mit 19 % entsteht abziehbare Vorsteuer.',
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
    scenario:
      'Wareneinkauf bei Ostsee Papier & Pack: 1.000,00 € netto, 19 % Vorsteuer, Zahlung später (Verbindlichkeiten).',
    solution: {
      debitAccount: '3400',
      creditAccount: '1600',
      netAmountCents: 1_00_000,
      vatRate: 19,
    },
    explanation:
      'Wareneingang 19 % (3400) im Soll, Verbindlichkeiten L+L (1600) im Haben über Brutto. Aufwand entsteht mit der Rechnung — nicht erst bei Zahlung oder Wareneingang physisch.',
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
    scenario:
      'Begleichung einer bereits gebuchten Eingangsrechnung: 1.190,00 € brutto (entspricht 1.000 € netto + 19 %) per Bank. Keine erneute Aufwandbuchung.',
    solution: {
      debitAccount: '1600',
      creditAccount: '1200',
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
    scenario:
      'Ausgangsrechnung an Küstenküche AG: 2.000,00 € netto Erlöse 19 %, Forderung entsteht.',
    solution: {
      debitAccount: '1400',
      creditAccount: '8400',
      netAmountCents: 2_00_000,
      vatRate: 19,
    },
    explanation:
      'Forderungen (1400) im Soll über Brutto, Erlöse 19 % (8400) im Haben über Netto; Umsatzsteuer wird vom Journal ergänzt.',
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
    scenario:
      'Kunde überweist 2.380,00 € brutto auf die Bank zur Begleichung einer gebuchten Ausgangsrechnung (2.000 € + 19 %).',
    solution: {
      debitAccount: '1200',
      creditAccount: '1400',
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
    scenario:
      'Einkauf Bio-Gewürze: 500,00 € netto zum ermäßigten Satz 7 %, auf Rechnung (Verbindlichkeiten).',
    solution: {
      debitAccount: '3300',
      creditAccount: '1600',
      netAmountCents: 50_000,
      vatRate: 7,
    },
    explanation:
      'Wareneingang 7 % (3300) im Soll, Verbindlichkeiten im Haben. Vorsteuerkonto 1571 wird vom Journal bei USt 7 % ergänzt — nicht manuell als Primärkonto gewählt.',
    effects: {
      assets: 'Vorsteuer 7 % steigt',
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
    scenario:
      'Verkauf ermäßigt besteuerter Ware: 300,00 € netto, 7 % USt, auf Ziel (Forderung).',
    solution: {
      debitAccount: '1400',
      creditAccount: '8300',
      netAmountCents: 30_000,
      vatRate: 7,
    },
    explanation:
      'Erlöse 7 % liegen auf Konto 8300. Forderung im Soll (Brutto), USt 1771 ergänzt das Journal automatisch.',
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
    title: 'Wirkung auf GuV: Fahrzeugkosten',
    topic: 'bilanz_guv',
    difficulty: 'schwer',
    scenario:
      'Sofortzahlung Fahrzeugkosten 250,00 € netto + 19 % USt per Bank. Welche Buchung erfasst den Aufwand korrekt?',
    solution: {
      debitAccount: '4500',
      creditAccount: '1200',
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
    scenario:
      'Privatdarlehen wird ausgezahlt: 5.000,00 € gehen auf das Bankkonto (Passivzuwachs und Aktivzuwachs). Ohne USt.',
    solution: {
      debitAccount: '1200',
      creditAccount: '1800',
      netAmountCents: 5_00_000,
      vatRate: 0,
    },
    explanation:
      'Bank und sonstige Verbindlichkeiten steigen gleichermaßen — Bilanzverlängerung ohne Erfolgswirkung. Kein Aufwand, kein Ertrag.',
    effects: {
      assets: 'Bank steigt',
      liabilities: 'Privatdarlehen/sonst. Verbindlichkeiten steigen',
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
    scenario:
      'Reparatur Werkstatt: 150,00 € netto + 19 % USt, Rechnung noch offen.',
    solution: {
      debitAccount: '4800',
      creditAccount: '1600',
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

export function computeLearningTotalPoints(
  progress: LearningState['progress'],
): number {
  return progress
    .filter((item) => item.completed)
    .reduce((sum, item) => sum + item.bestScore, 0)
}
