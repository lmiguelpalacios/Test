import type { CompanyInfo, MonthlySeriesPoint } from '../types'

/** Stammdaten / separate Demoansichten — nicht die Journal-Datenquelle. */
export const companyInfo: CompanyInfo = {
  name: 'Nordlicht Handels GmbH',
  legalForm: 'GmbH',
  businessPeriod: 'Geschäftsjahr 2026 (01.01.–31.12.2026)',
  isDemo: true,
}

/**
 * YTD-Monatsreihe nur für die Dashboard-Demo-Grafik.
 * Wird bewusst nicht aus dem Lernjournal abgeleitet.
 */
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
