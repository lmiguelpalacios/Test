import { eurosToCents } from '../../accounting/money'
import { calculateGrossCents } from '../../accounting/vat'
import {
  BANK_ACCOUNT,
  CASH_ACCOUNT,
  GOODS_EXPENSE_ACCOUNT,
  GOODS_REVENUE_ACCOUNT,
  PAYABLE_ACCOUNT,
  RECEIVABLE_ACCOUNT,
} from '../../data/chart-of-accounts'
import { EBK_ACCOUNT } from './solve'
import type { JournalLine } from '../../types/accounting'
import type { TrainingCase, TrainingEvent } from './types'

export const NORDLICHT_CASE_ID = 'nordlicht-abschluss-2026'

export const NORDLICHT_FACTS = {
  equipmentAccount: '087',
  equipmentCents: eurosToCents(10_000),
  goodsAccount: '221',
  openingGoodsCents: eurosToCents(8_000),
  openingReceivableCents: eurosToCents(2_380),
  openingBankCents: eurosToCents(15_000),
  openingCashCents: eurosToCents(500),
  openingPayableCents: eurosToCents(3_570),
  equityAccount: '300',
  purchaseNetCents: eurosToCents(5_000),
  saleNetCents: eurosToCents(12_000),
  rentAccount: '670',
  rentNetCents: eurosToCents(1_200),
  interestAccount: '571',
  interestCents: eurosToCents(80),
  endingGoodsCents: eurosToCents(6_000),
  vatRate: 19 as const,
}

const FACTS = NORDLICHT_FACTS

function openingEquityCents(): number {
  const assets =
    FACTS.equipmentCents +
    FACTS.openingGoodsCents +
    FACTS.openingReceivableCents +
    FACTS.openingBankCents +
    FACTS.openingCashCents
  return assets - FACTS.openingPayableCents
}

function ebkLines(): JournalLine[] {
  const assets: { account: string; cents: number }[] = [
    { account: FACTS.equipmentAccount, cents: FACTS.equipmentCents },
    { account: FACTS.goodsAccount, cents: FACTS.openingGoodsCents },
    { account: RECEIVABLE_ACCOUNT, cents: FACTS.openingReceivableCents },
    { account: BANK_ACCOUNT, cents: FACTS.openingBankCents },
    { account: CASH_ACCOUNT, cents: FACTS.openingCashCents },
  ]
  const credits: { account: string; cents: number }[] = [
    { account: PAYABLE_ACCOUNT, cents: FACTS.openingPayableCents },
    { account: FACTS.equityAccount, cents: openingEquityCents() },
  ]
  const lines: JournalLine[] = []
  for (const row of assets) {
    lines.push({ accountNumber: row.account, debitCents: row.cents, creditCents: 0 })
    lines.push({ accountNumber: EBK_ACCOUNT, debitCents: 0, creditCents: row.cents })
  }
  for (const row of credits) {
    lines.push({ accountNumber: EBK_ACCOUNT, debitCents: row.cents, creditCents: 0 })
    lines.push({ accountNumber: row.account, debitCents: 0, creditCents: row.cents })
  }
  return lines
}

function simple(
  event: Omit<TrainingEvent, 'booking'> & {
    description: string
    debitAccount: string
    creditAccount: string
    netAmountCents: number
    vatRate: 0 | 7 | 19
  },
): TrainingEvent {
  return {
    id: event.id,
    date: event.date,
    documentNumber: event.documentNumber,
    party: event.party,
    title: event.title,
    story: event.story,
    booking: {
      kind: 'simple',
      draft: {
        date: event.date,
        documentNumber: event.documentNumber,
        description: event.description,
        debitAccount: event.debitAccount,
        creditAccount: event.creditAccount,
        netAmountCents: event.netAmountCents,
        vatRate: event.vatRate,
      },
    },
  }
}

const purchaseGross = calculateGrossCents(FACTS.purchaseNetCents, FACTS.vatRate)
const saleGross = calculateGrossCents(FACTS.saleNetCents, FACTS.vatRate)
const rentGross = calculateGrossCents(FACTS.rentNetCents, FACTS.vatRate)

const events: TrainingEvent[] = [
  {
    id: 'ev-01-eroeffnung',
    date: '2026-01-01',
    documentNumber: 'EB-2026',
    party: 'Nordlicht Handels GmbH',
    title: 'Eröffnung',
    story:
      'Die Salden der Eröffnungsbilanz werden über das Eröffnungsbilanzkonto vorgetragen: Geschäftsausstattung 10.000,00 €, Handelswaren 8.000,00 €, Forderungen 2.380,00 €, Bank 15.000,00 €, Kasse 500,00 €, Verbindlichkeiten aus Lieferungen und Leistungen 3.570,00 €, Eigenkapital als Rest.',
    booking: {
      kind: 'compound',
      description: 'Eröffnungsbilanz über Eröffnungsbilanzkonto',
      lines: ebkLines(),
    },
  },
  simple({
    id: 'ev-02-einkauf',
    date: '2026-03-12',
    documentNumber: 'ER-1044',
    party: 'Ostsee GmbH',
    title: 'Wareneinkauf auf Ziel',
    story:
      'Eingangsrechnung der Ostsee GmbH über Handelswaren, 5.000,00 € netto zuzüglich 19 % Umsatzsteuer, Zahlungsziel. Die Ware ist Aufwand der Periode, kein zweites Bestandskonto.',
    description: 'Wareneinkauf Ostsee GmbH auf Ziel',
    debitAccount: GOODS_EXPENSE_ACCOUNT,
    creditAccount: PAYABLE_ACCOUNT,
    netAmountCents: FACTS.purchaseNetCents,
    vatRate: FACTS.vatRate,
  }),
  simple({
    id: 'ev-03-verkauf',
    date: '2026-04-02',
    documentNumber: 'AR-220',
    party: 'Hafen AG',
    title: 'Warenverkauf auf Ziel',
    story:
      'Ausgangsrechnung an die Hafen AG über Handelswaren, 12.000,00 € netto zuzüglich 19 % Umsatzsteuer, auf Ziel.',
    description: 'Warenverkauf Hafen AG auf Ziel',
    debitAccount: RECEIVABLE_ACCOUNT,
    creditAccount: GOODS_REVENUE_ACCOUNT,
    netAmountCents: FACTS.saleNetCents,
    vatRate: FACTS.vatRate,
  }),
  simple({
    id: 'ev-04-zahlung-kunde',
    date: '2026-05-15',
    documentNumber: 'ZE-220',
    party: 'Hafen AG',
    title: 'Zahlung der Hafen AG',
    story: `Die Hafen AG überweist den vollen Rechnungsbetrag von ${(saleGross / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € auf das Bankkonto.`,
    description: 'Zahlungseingang Hafen AG',
    debitAccount: BANK_ACCOUNT,
    creditAccount: RECEIVABLE_ACCOUNT,
    netAmountCents: saleGross,
    vatRate: 0,
  }),
  simple({
    id: 'ev-05-zahlung-lieferant',
    date: '2026-06-01',
    documentNumber: 'ZA-1044',
    party: 'Ostsee GmbH',
    title: 'Zahlung an die Ostsee GmbH',
    story: `Überweisung der Rechnung ER-1044 über ${(purchaseGross / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} € vom Bankkonto.`,
    description: 'Zahlung Ostsee GmbH',
    debitAccount: PAYABLE_ACCOUNT,
    creditAccount: BANK_ACCOUNT,
    netAmountCents: purchaseGross,
    vatRate: 0,
  }),
  simple({
    id: 'ev-06-miete',
    date: '2026-07-01',
    documentNumber: 'ER-MIETE-07',
    party: 'Kontor Vermietung',
    title: 'Miete per Bank',
    story: `Miete Juli, 1.200,00 € netto zuzüglich 19 % Umsatzsteuer, sofort vom Bankkonto gezahlt (${(rentGross / 100).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €).`,
    description: 'Miete Kontor Vermietung per Bank',
    debitAccount: FACTS.rentAccount,
    creditAccount: BANK_ACCOUNT,
    netAmountCents: FACTS.rentNetCents,
    vatRate: FACTS.vatRate,
  }),
  simple({
    id: 'ev-07-zinsen',
    date: '2026-08-20',
    documentNumber: 'BK-ZINS',
    party: 'Hausbank',
    title: 'Zinsertrag',
    story: 'Die Hausbank schreibt 80,00 € Habenzinsen gut. Keine Umsatzsteuer.',
    description: 'Habenzinsen Hausbank',
    debitAccount: BANK_ACCOUNT,
    creditAccount: FACTS.interestAccount,
    netAmountCents: FACTS.interestCents,
    vatRate: 0,
  }),
  simple({
    id: 'ev-08-anfangsbestand',
    date: '2026-12-31',
    documentNumber: 'SB-AB',
    party: 'Lager',
    title: 'Anfangsbestand in den Wareneinsatz',
    story:
      'Aufwandsmethode zum Stichtag: der eröffnete Handelswarenbestand von 8.000,00 € wird in den Wareneinsatz umgebucht. Der Einkauf bleibt Aufwand und wird nicht noch einmal erfasst.',
    description: 'Anfangsbestand Handelswaren in den Wareneinsatz',
    debitAccount: GOODS_EXPENSE_ACCOUNT,
    creditAccount: FACTS.goodsAccount,
    netAmountCents: FACTS.openingGoodsCents,
    vatRate: 0,
  }),
  simple({
    id: 'ev-09-inventur',
    date: '2026-12-31',
    documentNumber: 'INV-2026',
    party: 'Lager',
    title: 'Inventur-Endbestand',
    story:
      'Die Inventur zählt Handelswaren von 6.000,00 €. Dieser Endbestand wird aktiviert und mindert den Wareneinsatz. Zusammen mit dem Anfangsbestand ergibt das den Wareneinsatz der Periode, ohne den Einkauf doppelt zu zählen.',
    description: 'Endbestand Handelswaren laut Inventur',
    debitAccount: FACTS.goodsAccount,
    creditAccount: GOODS_EXPENSE_ACCOUNT,
    netAmountCents: FACTS.endingGoodsCents,
    vatRate: 0,
  }),
]

export const nordlichtCase: TrainingCase = {
  id: NORDLICHT_CASE_ID,
  title: 'Nordlicht Handels — Abschluss 2026',
  company: 'Nordlicht Handels GmbH',
  vatEnabled: true,
  asOf: '2026-12-31',
  range: { from: '2026-01-01', to: '2026-12-31' },
  assumptions: [
    {
      title: 'Kontenrahmen',
      body: 'Schulkontenrahmen Industrie. Es gibt kein separates Wareneingangskonto je Steuersatz.',
    },
    {
      title: 'Umsatzsteuer',
      body: 'Der Fall bucht 19 % auf Wareneinkauf, Warenverkauf und Miete. Habenzinsen sind ohne Umsatzsteuer. Diese Fallregel ist unabhängig vom Schalter in den Einstellungen und schreibt ihn nicht um.',
    },
    {
      title: 'Waren / Wareneinsatz',
      body: 'Aufwandsmethode: der Einkauf ist Wareneinsatz. Der Anfangsbestand geht am Stichtag in den Wareneinsatz, der Inventurbestand wird wieder Bestand. Der Einkauf wird nicht zusätzlich auf dem Warenbestandskonto erfasst.',
    },
    {
      title: 'Abschluss',
      body: 'Erfolgskonten werden über das GuV-Konto geschlossen, der Saldo ins Bilanzergebnis (Eigenkapital). Bestandskonten gehen über das Schlussbilanzkonto. Gleichheit der Summen allein reicht nicht.',
    },
  ],
  events,
  hints: {
    B: {
      general: 'Jede Buchung gleicht Soll und Haben aus. Steuerpflichtige Rechnungen haben mehr als zwei Zeilen.',
      accountClass: 'Warenaufwand und Miete liegen in Klasse 6, Erlöse und Zinsen in Klasse 5, Bestand und Steuerforderung in Klasse 2, Steuerverbindlichkeit in Klasse 4.',
      principle: 'Netto auf das Erfolgskonto, Steuer daneben, Brutto auf Forderung, Verbindlichkeit oder Bank. Warenbestand nur für Anfangs- und Endbestand, nicht für den Einkauf.',
    },
    C: {
      general: 'Summe jede Seite selbst. Der Saldo ist die Differenz und steht auf der größeren Seite.',
      accountClass: 'Erfolgskonten werden später über das GuV-Konto geschlossen, Bestandskonten über das Schlussbilanzkonto.',
      principle: 'Ein ausgeglichenes Konto (Eröffnungsbilanzkonto) hat keinen Abschluss. Der Saldo folgt Soll minus Haben aus genau diesen Zeilen.',
    },
    D: {
      general: 'Jede Abschlussbuchung muss für sich ausgeglichen sein. Mehrere Zeilen in einer Buchung sind erlaubt.',
      accountClass: 'Klasse 5 und 6 zum GuV-Konto, dessen Saldo ins Eigenkapital, Klasse 0 bis 4 zum Schlussbilanzkonto.',
      principle: 'Gewinn: GuV-Konto an Bilanzergebnis. Verlust wäre die Gegenbuchung. Danach sind die Erfolgskonten null.',
    },
    E: {
      general: 'Übernimm die Erfolgssalden vor dem Abschluss, nicht die schon geschlossenen Nullen.',
      accountClass: 'Aufwand steht im Soll der GuV, Ertrag im Haben.',
      principle: 'Gewinn = Erträge − Aufwendungen und steht als Ausgleich im Soll. Ein Verlust stünde im Haben.',
    },
    F: {
      general: 'Ordne jedes Bestandskonto der Seite zu, auf der sein Saldo steht. Die Summen allein bestehen die Prüfung nicht.',
      accountClass: 'Aktiva sind Sollsalden der Bestandskonten, Verbindlichkeiten Habensalden, Eigenkapital einschließlich des Bilanzergebnisses.',
      principle: 'Das Ergebnis erhöht oder mindert das Eigenkapital. Das Schlussbilanzkonto sammelt beide Seiten mit derselben Summe.',
    },
    G: {
      general: 'Der Fall ist erst fertig, wenn jede Pflichtphase als Korrekt geprüft wurde.',
      accountClass: 'Übersprungen oder nur geöffnet zählt nicht.',
      principle: 'Eine Änderung an einer früheren Phase nimmt späteren Phasen den Status Korrekt, bis sie neu geprüft werden.',
    },
  },
}

export function cogsCents(): number {
  return FACTS.openingGoodsCents + FACTS.purchaseNetCents - FACTS.endingGoodsCents
}
