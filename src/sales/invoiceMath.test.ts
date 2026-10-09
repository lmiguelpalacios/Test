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
})
