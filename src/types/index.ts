export type NavItemId =
  | 'dashboard'
  | 'buchhaltung'
  | 'verkauf'
  | 'einkauf'
  | 'lager'
  | 'kontakte'
  | 'berichte'
  | 'lernmodus'
  | 'einstellungen'

export interface CompanyInfo {
  name: string
  legalForm: string
  businessPeriod: string
  isDemo: true
}

export interface KpiMetric {
  id: string
  label: string
  value: number
  format: 'currency' | 'number'
  changePercent?: number
  hint?: string
}

export interface MonthlySeriesPoint {
  month: string
  revenue: number
  expenses: number
  result: number
}

export type ActivityKind =
  | 'rechnung'
  | 'zahlung'
  | 'einkauf'
  | 'lager'
  | 'kontakt'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  title: string
  description: string
  amount?: number
  occurredAt: string
}

export interface OpenItem {
  id: string
  party: string
  documentNumber: string
  dueDate: string
  amount: number
}
