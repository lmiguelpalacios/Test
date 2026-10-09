import type { VatRate } from '../types/accounting'
import type { InvoiceLine, InvoiceTotals } from '../types/sales'
import { calculateTaxCents } from '../accounting/vat'

export function lineNetCents(quantity: number, netUnitPriceCents: number): number {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error('Menge muss größer als 0 sein')
  }
  if (!Number.isInteger(netUnitPriceCents) || netUnitPriceCents < 0) {
    throw new Error('Netto-Einzelpreis muss ein nicht-negativer Cent-Betrag sein')
  }
  return Math.round(quantity * netUnitPriceCents)
}

export function validateInvoiceLine(line: InvoiceLine): string | null {
  if (!line.description.trim()) return 'Positionsbeschreibung fehlt.'
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
    return 'Menge muss größer als 0 sein.'
  }
  if (!Number.isInteger(line.netUnitPriceCents) || line.netUnitPriceCents < 0) {
    return 'Netto-Einzelpreis ist ungültig.'
  }
  if (line.vatRate !== 0 && line.vatRate !== 7 && line.vatRate !== 19) {
    return 'USt-Satz muss 0 %, 7 % oder 19 % sein.'
  }
  return null
}

export function calculateInvoiceTotals(lines: InvoiceLine[]): InvoiceTotals {
  let netCents = 0
  let taxCents = 0
  for (const line of lines) {
    const error = validateInvoiceLine(line)
    if (error) throw new Error(error)
    const net = lineNetCents(line.quantity, line.netUnitPriceCents)
    netCents += net
    taxCents += calculateTaxCents(net, line.vatRate)
  }
  return {
    netCents,
    taxCents,
    grossCents: netCents + taxCents,
  }
}

export function revenueAccountForVat(vatRate: VatRate): string {
  if (vatRate === 19) return '8400'
  if (vatRate === 7) return '8300'
  return '8000'
}

export function groupLinesByVatRate(
  lines: InvoiceLine[],
): Map<VatRate, { netCents: number; taxCents: number }> {
  const groups = new Map<VatRate, { netCents: number; taxCents: number }>()
  for (const line of lines) {
    const net = lineNetCents(line.quantity, line.netUnitPriceCents)
    const tax = calculateTaxCents(net, line.vatRate)
    const current = groups.get(line.vatRate) ?? { netCents: 0, taxCents: 0 }
    current.netCents += net
    current.taxCents += tax
    groups.set(line.vatRate, current)
  }
  return groups
}
