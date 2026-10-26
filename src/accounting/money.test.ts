import { describe, expect, it } from 'vitest'
import {
  addCents,
  eurosToCents,
  formatCents,
  isBalanced,
  parseEuroInput,
} from './money'

describe('money (Cent-Arithmetik)', () => {
  it('wandelt Euro in Cent ohne Float-Drift', () => {
    expect(eurosToCents(19.99)).toBe(1999)
    expect(eurosToCents(0.1 + 0.2)).toBe(30)
  })

  it('parst deutsche und punktierte Eingaben', () => {
    expect(parseEuroInput('1.234,56')).toBeNull()
    expect(parseEuroInput('1234,56')).toBe(123456)
    expect(parseEuroInput('99.5')).toBe(9950)
    expect(parseEuroInput('')).toBeNull()
    expect(parseEuroInput('abc')).toBeNull()
  })

  it('addiert Cent exakt und prüft Ausgleich', () => {
    expect(addCents(100, 19, 1)).toBe(120)
    expect(isBalanced(11900, 11900)).toBe(true)
    expect(isBalanced(11900, 11899)).toBe(false)
  })

  it('formatiert Cent als EUR', () => {
    expect(formatCents(123456)).toMatch(/1\.234,56/)
  })
})
