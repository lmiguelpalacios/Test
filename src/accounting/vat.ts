import type { VatRate } from '../types/accounting'
import type { Cents } from './money'

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
