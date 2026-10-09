import type {
  ActivityItem,
  CompanyInfo,
  KpiMetric,
  MonthlySeriesPoint,
  OpenItem,
} from '../types'

/** Demo-Daten für das Übungsunternehmen — keine echte Buchhaltung/DB. */
export const companyInfo: CompanyInfo = {
  name: 'Nordlicht Handels GmbH',
  legalForm: 'GmbH',
  businessPeriod: 'Geschäftsjahr 2026 (01.01.–31.12.2026)',
  isDemo: true,
}

export const kpiMetrics: KpiMetric[] = [
  {
    id: 'balance',
    label: 'Kontostand',
    value: 84_350.45,
    format: 'currency',
    changePercent: 4.2,
    hint: 'Summe Bankkonten (Demo)',
  },
  {
    id: 'revenue',
    label: 'Umsatz',
    value: 216_480.0,
    format: 'currency',
    changePercent: 8.6,
    hint: 'YTD Nettoerlöse (Demo)',
  },
  {
    id: 'expenses',
    label: 'Ausgaben',
    value: 168_920.35,
    format: 'currency',
    changePercent: 3.1,
    hint: 'YTD Aufwand (Demo)',
  },
  {
    id: 'result',
    label: 'Vorläufiges Ergebnis',
    value: 47_559.65,
    format: 'currency',
    changePercent: 12.4,
    hint: 'Umsatz − Ausgaben (Demo)',
  },
]

export const openReceivables: OpenItem[] = [
  {
    id: 'ar-1',
    party: 'Küstenküche AG',
    documentNumber: 'RE-2026-0142',
    dueDate: '2026-10-18',
    amount: 4_820.0,
  },
  {
    id: 'ar-2',
    party: 'Hafenmarkt OHG',
    documentNumber: 'RE-2026-0151',
    dueDate: '2026-10-22',
    amount: 2_145.5,
  },
  {
    id: 'ar-3',
    party: 'Baltic Office GmbH',
    documentNumber: 'RE-2026-0158',
    dueDate: '2026-10-28',
    amount: 6_390.0,
  },
]

export const openPayables: OpenItem[] = [
  {
    id: 'ap-1',
    party: 'Nordsee Logistik SE',
    documentNumber: 'ER-2026-0088',
    dueDate: '2026-10-15',
    amount: 3_260.0,
  },
  {
    id: 'ap-2',
    party: 'Ostsee Papier & Pack',
    documentNumber: 'ER-2026-0094',
    dueDate: '2026-10-20',
    amount: 1_875.4,
  },
]

export const monthlySeries: MonthlySeriesPoint[] = [
  { month: 'Jan', revenue: 18_200, expenses: 14_800, result: 3_400 },
  { month: 'Feb', revenue: 19_450, expenses: 15_100, result: 4_350 },
  { month: 'Mär', revenue: 21_100, expenses: 16_400, result: 4_700 },
  { month: 'Apr', revenue: 20_300, expenses: 15_900, result: 4_400 },
  { month: 'Mai', revenue: 22_800, expenses: 17_200, result: 5_600 },
  { month: 'Jun', revenue: 24_150, expenses: 18_050, result: 6_100 },
  { month: 'Jul', revenue: 23_400, expenses: 17_800, result: 5_600 },
  { month: 'Aug', revenue: 21_900, expenses: 16_950, result: 4_950 },
  { month: 'Sep', revenue: 25_180, expenses: 19_220, result: 5_960 },
  { month: 'Okt', revenue: 20_000, expenses: 17_500, result: 2_500 },
]

export const recentActivities: ActivityItem[] = [
  {
    id: 'act-1',
    kind: 'rechnung',
    title: 'Ausgangsrechnung erstellt',
    description: 'RE-2026-0158 an Baltic Office GmbH',
    amount: 6_390.0,
    occurredAt: '2026-10-09T09:15:00',
  },
  {
    id: 'act-2',
    kind: 'zahlung',
    title: 'Zahlungseingang gebucht',
    description: 'Überweisung von Hafenmarkt OHG',
    amount: 1_980.0,
    occurredAt: '2026-10-08T16:40:00',
  },
  {
    id: 'act-3',
    kind: 'einkauf',
    title: 'Eingangsrechnung erfasst',
    description: 'ER-2026-0094 von Ostsee Papier & Pack',
    amount: 1_875.4,
    occurredAt: '2026-10-08T11:05:00',
  },
  {
    id: 'act-4',
    kind: 'lager',
    title: 'Wareneingang verbucht',
    description: 'Artikelgruppe Verpackungsmaterial',
    occurredAt: '2026-10-07T14:20:00',
  },
  {
    id: 'act-5',
    kind: 'kontakt',
    title: 'Neuer Lieferant angelegt',
    description: 'Mitte Holstein Großhandel e.K.',
    occurredAt: '2026-10-06T10:00:00',
  },
  {
    id: 'act-6',
    kind: 'rechnung',
    title: 'Mahnung vorbereitet',
    description: 'RE-2026-0142 Küstenküche AG (Demo)',
    amount: 4_820.0,
    occurredAt: '2026-10-05T13:30:00',
  },
]

export const totalOpenReceivables = openReceivables.reduce(
  (sum, item) => sum + item.amount,
  0,
)

export const totalOpenPayables = openPayables.reduce(
  (sum, item) => sum + item.amount,
  0,
)
