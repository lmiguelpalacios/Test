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
      `Ungültiger Demodatensatz ${id}: ${result.issues.map((i) => i.message).join('; ')}`,
    )
  }
  return { ...result.entry, id, createdAt }
}

/** Realistische, konsistente Demo-Buchungen für Nordlicht Handels GmbH. */
export const initialJournalEntries: JournalEntry[] = [
  mustCreate('je-001', '2026-10-01T08:00:00', {
    date: '2026-10-01',
    documentNumber: 'ER-2026-0088',
    description: 'Wareneinkauf bei Nordsee Logistik SE',
    debitAccount: '608',
    creditAccount: '44',
    netAmountCents: 2_739_50,
    vatRate: 19,
  }),
  mustCreate('je-002', '2026-10-02T09:30:00', {
    date: '2026-10-02',
    documentNumber: 'RE-2026-0142',
    description: 'Warenverkauf an Küstenküche AG',
    debitAccount: '240',
    creditAccount: '501',
    netAmountCents: 4_050_42,
    vatRate: 19,
  }),
  mustCreate('je-003', '2026-10-03T11:00:00', {
    date: '2026-10-03',
    documentNumber: 'KA-2026-0012',
    description: 'Büromiete Oktober (überwiesen)',
    debitAccount: '670',
    creditAccount: '280',
    netAmountCents: 1_800_00,
    vatRate: 19,
  }),
  mustCreate('je-004', '2026-10-05T14:15:00', {
    date: '2026-10-05',
    documentNumber: 'RE-2026-0151',
    description: 'Warenverkauf an Hafenmarkt OHG',
    debitAccount: '240',
    creditAccount: '501',
    netAmountCents: 1_803_78,
    vatRate: 19,
  }),
  mustCreate('je-005', '2026-10-06T10:20:00', {
    date: '2026-10-06',
    documentNumber: 'ER-2026-0094',
    description: 'Verpackungsmaterial Ostsee Papier & Pack',
    debitAccount: '604',
    creditAccount: '44',
    netAmountCents: 1_576_81,
    vatRate: 19,
  }),
  mustCreate('je-006', '2026-10-07T16:40:00', {
    date: '2026-10-07',
    documentNumber: 'ZE-2026-0044',
    description: 'Zahlungseingang Hafenmarkt OHG (Teilbetrag)',
    debitAccount: '280',
    creditAccount: '240',
    netAmountCents: 1_980_00,
    vatRate: 0,
  }),
  mustCreate('je-007', '2026-10-08T09:10:00', {
    date: '2026-10-08',
    documentNumber: 'RE-2026-0158',
    description: 'Warenverkauf an Baltic Office GmbH',
    debitAccount: '240',
    creditAccount: '501',
    netAmountCents: 5_369_75,
    vatRate: 19,
  }),
  mustCreate('je-008', '2026-10-08T15:00:00', {
    date: '2026-10-08',
    documentNumber: 'ZA-2026-0031',
    description: 'Begleichung ER-2026-0088 an Nordsee Logistik',
    debitAccount: '44',
    creditAccount: '280',
    // Brutto zu Netto 2_739_50 + USt 19 % (Math.round) = 3_260_01
    netAmountCents: 3_260_01,
    vatRate: 0,
  }),
]

export function createJournalEntryId(): string {
  return `je-${crypto.randomUUID().slice(0, 8)}`
}
