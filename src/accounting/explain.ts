import type { Account, JournalEntryDraft, VatRate } from '../types/accounting'
import { formatCents } from './money'
import { calculateTaxCents } from './vat'

function accountLabel(account: Account | undefined, number: string): string {
  if (!account) return `Konto ${number}`
  return `${account.number} ${account.name}`
}

export function explainBooking(
  draft: JournalEntryDraft,
  debit: Account,
  credit: Account,
  taxCents: number,
): string {
  const net = formatCents(draft.netAmountCents)
  const tax = formatCents(taxCents)
  const gross = formatCents(draft.netAmountCents + taxCents)
  const soll = accountLabel(debit, draft.debitAccount)
  const haben = accountLabel(credit, draft.creditAccount)
  const vatNote = vatSentence(draft.vatRate, tax)

  if (debit.type === 'aufwand' && (credit.type === 'passiv' || credit.group === 'Finanzkonten')) {
    return (
      `Aufwandskontierung: Soll ${soll} (${net}) erhöht den Aufwand. ` +
      (draft.vatRate > 0
        ? `Vorsteuer wird separat im Soll gebucht (${tax}). Haben ${haben} mit ${gross} (Brutto). `
        : `Haben ${haben} mit ${net}. `) +
      vatNote +
      ` Begründung: Einkauf/Ausgabe belastet das Ergebnis; die Gegenbuchung steht auf Verbindlichkeit oder Bank.`
    )
  }

  if (credit.type === 'ertrag' && (debit.type === 'aktiv' || debit.group === 'Finanzkonten' || debit.group === 'Forderungen')) {
    return (
      `Erlöskontierung: Haben ${haben} (${net}) erhöht den Ertrag. ` +
      (draft.vatRate > 0
        ? `Umsatzsteuer wird separat im Haben gebucht (${tax}). Soll ${soll} mit ${gross} (Bruttoforderung/-zahlung). `
        : `Soll ${soll} mit ${net}. `) +
      vatNote +
      ` Begründung: Verkaufserlöse stehen im Haben; die Gegenbuchung erhöht Forderung oder Bank.`
    )
  }

  if (debit.group === 'Finanzkonten' && credit.group === 'Forderungen') {
    return (
      `Zahlungseingang: Soll ${soll} (${gross}) erhöht den Bankbestand, ` +
      `Haben ${haben} mindert die Forderung. ${vatNote}` +
      ` Begründung: Der Kunde begleicht eine offene Rechnung — kein neuer Ertrag.`
    )
  }

  if (debit.group === 'Verbindlichkeiten' && credit.group === 'Finanzkonten') {
    return (
      `Zahlungsausgang: Soll ${soll} (${gross}) mindert die Verbindlichkeit, ` +
      `Haben ${haben} mindert den Bankbestand. ${vatNote}` +
      ` Begründung: Begleichung einer Lieferantenrechnung ohne erneuten Aufwand.`
    )
  }

  return (
    `Buchung Soll ${soll} gegen Haben ${haben} über Netto ${net}` +
    (draft.vatRate > 0 ? `, Steuer ${tax}, Brutto ${gross}` : '') +
    `. ${vatNote}` +
    ` Die Konten wurden so gewählt, dass Soll und Haben ausgeglichen sind.`
  )
}

function vatSentence(rate: VatRate, taxFormatted: string): string {
  if (rate === 0) {
    return 'Kein Umsatzsteuerausweis (0 %).'
  }
  return `USt-Satz ${rate} % → Steuerbetrag ${taxFormatted}.`
}

export function explainTaxCents(netCents: number, vatRate: VatRate): number {
  return calculateTaxCents(netCents, vatRate)
}
