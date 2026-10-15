import { describe, expect, it } from 'vitest'
import {
  calculateInvoiceTotals,
  groupLinesByVatRate,
  lineNetCents,
  validateInvoiceLine,
} from './invoiceMath'

describe('Rechnungsbeträge (Netto/USt/Brutto)', () => {
  it('berechnet Positionsnetto und verhindert ungültige Mengen', () => {
    expect(lineNetCents(2.5, 1000)).toBe(2500)
    expect(() => lineNetCents(0, 1000)).toThrow()
    expect(
      validateInvoiceLine({
        id: 'l1',
        description: 'Test',
        quantity: -1,
        netUnitPriceCents: 100,
        vatRate: 19,
      }),
    ).toBeTruthy()
  })

  it('summiert Netto, Steuer und Brutto je Position', () => {
    const totals = calculateInvoiceTotals([
      {
        id: 'a',
        description: 'A',
        quantity: 2,
        netUnitPriceCents: 10000,
        vatRate: 19,
      },
      {
        id: 'b',
        description: 'B',
        quantity: 1,
        netUnitPriceCents: 10000,
        vatRate: 7,
      },
    ])
    expect(totals.netCents).toBe(30000)
    expect(totals.taxCents).toBe(3800 + 700)
    expect(totals.grossCents).toBe(34500)
  })

  it('gruppiert Positionen nach USt-Satz', () => {
    const groups = groupLinesByVatRate([
      {
        id: 'a',
        description: 'A',
        quantity: 1,
        netUnitPriceCents: 10000,
        vatRate: 19,
      },
      {
        id: 'b',
        description: 'B',
        quantity: 1,
        netUnitPriceCents: 5000,
        vatRate: 19,
      },
      {
        id: 'c',
        description: 'C',
        quantity: 1,
        netUnitPriceCents: 2000,
        vatRate: 7,
      },
    ])
    expect(groups.get(19)?.netCents).toBe(15000)
    expect(groups.get(7)?.netCents).toBe(2000)
  })

  it('USt bei gleichem Satz: Rechnungsbrutto = Gruppensteuer (kein Cent-Drift vs. Journal)', () => {
    const lines = [
      {
        id: 'a',
        description: 'A',
        quantity: 1.1,
        netUnitPriceCents: 1999,
        vatRate: 19 as const,
      },
      {
        id: 'b',
        description: 'B',
        quantity: 2.3,
        netUnitPriceCents: 1999,
        vatRate: 19 as const,
      },
      {
        id: 'c',
        description: 'C',
        quantity: 0.5,
        netUnitPriceCents: 1999,
        vatRate: 19 as const,
      },
    ]
    const totals = calculateInvoiceTotals(lines)
    const group = groupLinesByVatRate(lines).get(19)!
    expect(totals.netCents).toBe(group.netCents)
    expect(totals.taxCents).toBe(group.taxCents)
    expect(totals.grossCents).toBe(group.netCents + group.taxCents)
    // Positionsweise Steuer würde 1482 ergeben; Gruppensteuer ist 1481
    expect(totals.taxCents).toBe(1481)
    expect(totals.grossCents).toBe(9278)
  })
})
