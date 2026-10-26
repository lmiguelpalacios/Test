import type { VatRate } from '../types/accounting'
import type { InvoiceLine, InvoiceTotals } from '../types/sales'
import { calculateTaxCents } from '../accounting/vat'
import { GOODS_REVENUE_ACCOUNT } from '../data/chart-of-accounts'

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
  for (const line of lines) {
    const error = validateInvoiceLine(line)
    if (error) throw new Error(error)
  }
  // Steuer je USt-Satz auf Summennetto — identisch zur Journalbuchung
  // (keine positionsweise Steuer, die vom Gruppen-Netto abweichen kann).
  const groups = groupLinesByVatRate(lines)
  let netCents = 0
  let taxCents = 0
  for (const group of groups.values()) {
    netCents += group.netCents
    taxCents += group.taxCents
  }
  return {
    netCents,
    taxCents,
    grossCents: netCents + taxCents,
  }
}

/** Schulkontenrahmen: ein Erlöskonto für Handelswaren, unabhängig vom Satz. */
export function revenueAccountForVat(_vatRate: VatRate): string {
  return GOODS_REVENUE_ACCOUNT
}

export function groupLinesByVatRate(
  lines: InvoiceLine[],
): Map<VatRate, { netCents: number; taxCents: number }> {
  const nets = new Map<VatRate, number>()
  for (const line of lines) {
    const net = lineNetCents(line.quantity, line.netUnitPriceCents)
    nets.set(line.vatRate, (nets.get(line.vatRate) ?? 0) + net)
  }
  const groups = new Map<VatRate, { netCents: number; taxCents: number }>()
  for (const [vatRate, netCents] of nets) {
    groups.set(vatRate, {
      netCents,
      taxCents: calculateTaxCents(netCents, vatRate),
    })
  }
  return groups
}
