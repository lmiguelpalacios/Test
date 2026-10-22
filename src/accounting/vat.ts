import type { VatRate } from '../types/accounting'
import type { Cents } from './money'

/** Shown on Einstellungen when Umsatzsteuer is off. */
export const VAT_DISABLED_NOTE =
  'Bereits gebuchte Steuerzeilen bleiben im Journal. Nur neue Buchungen lassen die Umsatzsteuer weg.'

export const TAX_LINE_ACCOUNTS = ['1571', '1576', '1771', '1776'] as const

export function isTaxLineAccount(accountNumber: string): boolean {
  return (TAX_LINE_ACCOUNTS as readonly string[]).includes(accountNumber)
}

/** Org/workspace flag off → every rate is treated as 0 %. */
export function effectiveVatRate(vatRate: VatRate, vatEnabled: boolean): VatRate {
  return vatEnabled ? vatRate : 0
}

/**
 * Unbooked documents follow the current flag. Booked documents keep the rate
 * that was stored with the historical posting.
 */
export function displayVatRate(
  vatRate: VatRate,
  vatEnabled: boolean,
  booked: boolean,
): VatRate {
  return vatEnabled || booked ? vatRate : 0
}

/** Steuerbetrag aus Netto und Satz (kaufmännisch gerundet auf Cent). */
export function calculateTaxCents(netCents: Cents, vatRate: VatRate): Cents {
  if (netCents < 0) {
    throw new Error('Nettobetrag darf nicht negativ sein')
  }
  if (vatRate !== 0 && vatRate !== 7 && vatRate !== 19) {
    throw new Error('Ungültiger USt-Satz')
  }
  return Math.round((netCents * vatRate) / 100)
}

export function calculateGrossCents(netCents: Cents, vatRate: VatRate): Cents {
  return netCents + calculateTaxCents(netCents, vatRate)
}

export function isVatRate(value: number): value is VatRate {
  return value === 0 || value === 7 || value === 19
}
