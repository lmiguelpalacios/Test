import { describe, expect, it } from 'vitest'
import { calculateGrossCents, calculateTaxCents, isVatRate } from './vat'

describe('Umsatzsteuerberechnung', () => {
  it('berechnet 19 % kaufmännisch gerundet', () => {
    expect(calculateTaxCents(10000, 19)).toBe(1900)
    expect(calculateTaxCents(273950, 19)).toBe(52051)
    expect(calculateGrossCents(10000, 19)).toBe(11900)
  })

  it('berechnet 7 % und 0 %', () => {
    expect(calculateTaxCents(10000, 7)).toBe(700)
    expect(calculateTaxCents(10000, 0)).toBe(0)
    expect(calculateGrossCents(10000, 0)).toBe(10000)
  })

  it('erkennt gültige Sätze', () => {
    expect(isVatRate(19)).toBe(true)
    expect(isVatRate(16)).toBe(false)
  })
})
