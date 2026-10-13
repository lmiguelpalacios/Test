import type { JournalEntry } from '../types/accounting'

export interface DateRange {
  from: string
  to: string
}

export function isValidIsoDate(value: string): boolean {
  return Boolean(value) && !Number.isNaN(Date.parse(value))
}

/** Inklusiv: from ≤ date ≤ to */
export function entryInRange(entry: JournalEntry, range: DateRange): boolean {
  return entry.date >= range.from && entry.date <= range.to
}

export function entryOnOrBefore(entry: JournalEntry, asOf: string): boolean {
  return entry.date <= asOf
}

export function filterEntriesByRange(
  entries: JournalEntry[],
  range: DateRange,
): JournalEntry[] {
  return entries.filter((entry) => entryInRange(entry, range))
}

export function filterEntriesOnOrBefore(
  entries: JournalEntry[],
  asOf: string,
): JournalEntry[] {
  return entries.filter((entry) => entryOnOrBefore(entry, asOf))
}

export function filterEntriesBefore(
  entries: JournalEntry[],
  date: string,
): JournalEntry[] {
  return entries.filter((entry) => entry.date < date)
}

export const NO_OPENING_BALANCE_NOTICE =
  'Keine Eröffnungsbuchungen im Journal — Anfangssalden sind 0 und kein vollständiger Vorjahresabschluss.'

export const REPORT_SIMPLIFICATION_NOTICE =
  'Berichte nur aus dem zentralen Lernjournal und Belegdaten. Kein handels-/steuerrechtlicher Jahresabschluss; vereinfachte Waren-/Lagerbuchhaltung (Aufwand bei Eingangsrechnung, nicht bei WE).'
