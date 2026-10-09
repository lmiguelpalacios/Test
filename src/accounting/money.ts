/** Cent-basierte Geldbeträge — vermeidet Float-Rundungsfehler. */

export type Cents = number

export function eurosToCents(euros: number): Cents {
  if (!Number.isFinite(euros)) {
    throw new Error('Ungültiger Euro-Betrag')
  }
  return Math.round(euros * 100)
}

export function parseEuroInput(value: string): Cents | null {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return null
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) return null
  const euros = Number(normalized)
  if (!Number.isFinite(euros)) return null
  return eurosToCents(euros)
}

export function centsToEuros(cents: Cents): number {
  return cents / 100
}

export function formatCents(cents: Cents): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(centsToEuros(cents))
}

export function addCents(...values: Cents[]): Cents {
  return values.reduce((sum, value) => sum + value, 0)
}

export function isBalanced(debitCents: Cents, creditCents: Cents): boolean {
  return debitCents === creditCents
}
