import { describe, expect, it } from 'vitest'
import { initialJournalEntries } from '../data/journal-entries'
import {
  buildJournalKpis,
  computeAccountBalanceCents,
  journalEntriesToActivities,
  sumByAccountType,
} from './deriveFromJournal'

describe('Kennzahlen aus Journal', () => {
  it('berechnet Erlöse und Aufwendungen aus Kontotypen', () => {
    const { revenueCents, expenseCents } = sumByAccountType(initialJournalEntries)
    expect(revenueCents).toBeGreaterThan(0)
    expect(expenseCents).toBeGreaterThan(0)
    expect(revenueCents).toBe(
      4_050_42 + 1_803_78 + 5_369_75, // Erlöse 8400 aus Demo
    )
  })

  it('bildet Bank-, Forderungs- und Verbindlichkeitssalden', () => {
    const bank = computeAccountBalanceCents(initialJournalEntries, '280')
    // ZE +1980, Miete -2142 (1800+342), ZA -3260,01 (Brutto zu ER-0088)
    expect(bank).toBe(1_980_00 - 2_142_00 - 3_260_01)

    const receivables = computeAccountBalanceCents(initialJournalEntries, '240')
    expect(receivables).toBeGreaterThan(0)

    const payables = computeAccountBalanceCents(initialJournalEntries, '44')
    // Verbindlichkeiten: Haben > Soll nach Zahlung → negativ in Soll-Haben-Sicht
    expect(payables).toBeLessThan(0)
  })

  it('leitet Aktivitäten und KPI-Karten ab', () => {
    const activities = journalEntriesToActivities(initialJournalEntries, 3)
    expect(activities).toHaveLength(3)
    expect(activities[0]?.id.startsWith('journal-')).toBe(true)

    const kpis = buildJournalKpis(initialJournalEntries)
    expect(kpis.some((kpi) => kpi.id === 'journal-revenue')).toBe(true)
    const revenue = kpis.find((kpi) => kpi.id === 'journal-revenue')
    expect(revenue?.value).toBe((4_050_42 + 1_803_78 + 5_369_75) / 100)
  })
})
