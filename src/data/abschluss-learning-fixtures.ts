import { validateJournalEntry } from '../accounting/validateEntry'
import type { JournalEntry, JournalEntryDraft } from '../types/accounting'
import { chartOfAccounts } from './chart-of-accounts'

function mustCreate(
  id: string,
  createdAt: string,
  draft: JournalEntryDraft,
): JournalEntry {
  const result = validateJournalEntry(draft, chartOfAccounts)
  if (!result.ok) {
    throw new Error(
      `Ungültiger Abschluss-Fixture ${id}: ${result.issues.map((i) => i.message).join('; ')}`,
    )
  }
  return { ...result.entry, id, createdAt }
}

/**
 * Mini-Journal für Lernmodus-Abschlussaufgaben (kein Live-Org-Journal).
 * Zwei Vorfälle: Warenverkauf auf Ziel + Miete per Bank.
 */
export const abschlussFixtureJournal: JournalEntry[] = [
  mustCreate('fix-je-01', '2026-10-01T09:00:00', {
    date: '2026-10-01',
    documentNumber: 'RE-FIX-0001',
    description: 'Warenverkauf an Übungskunde (Mini-Journal)',
    debitAccount: '240',
    creditAccount: '501',
    netAmountCents: 1_000_00,
    vatRate: 19,
  }),
  mustCreate('fix-je-02', '2026-10-02T11:00:00', {
    date: '2026-10-02',
    documentNumber: 'KA-FIX-0001',
    description: 'Büromiete (Mini-Journal)',
    debitAccount: '670',
    creditAccount: '280',
    netAmountCents: 500_00,
    vatRate: 19,
  }),
]
