import { BookOpen } from 'lucide-react'
import type { JournalEntry } from '../../types/accounting'
import { formatCents } from '../../accounting/money'
import { formatDate } from '../../lib/format'
import { AccountLabel } from './AccountLabel'

interface JournalEntryCardProps {
  entry: JournalEntry
}

export function JournalEntryCard({ entry }: JournalEntryCardProps) {
  return (
    <article className="journal-card">
      <header className="journal-card-header">
        <div>
          <p className="journal-card-meta">
            <time dateTime={entry.date}>{formatDate(entry.date)}</time>
            <span aria-hidden>·</span>
            <code>{entry.documentNumber}</code>
          </p>
          <h3 className="journal-card-title">{entry.description}</h3>
        </div>
        <div className="journal-card-amounts">
          <span>Netto {formatCents(entry.netAmountCents)}</span>
          {entry.vatRate > 0 ? (
            <span>
              USt {entry.vatRate} % · {formatCents(entry.taxAmountCents)}
            </span>
          ) : (
            <span>ohne USt</span>
          )}
          <strong>Brutto {formatCents(entry.grossAmountCents)}</strong>
        </div>
      </header>

      <div className="journal-lines">
        <table className="data-table compact">
          <thead>
            <tr>
              <th>Konto</th>
              <th className="num">Soll</th>
              <th className="num">Haben</th>
            </tr>
          </thead>
          <tbody>
            {entry.lines.map((line, index) => (
              <tr key={`${entry.id}-${line.accountNumber}-${index}`}>
                <td>
                  <AccountLabel number={line.accountNumber} />
                </td>
                <td className="num">
                  {line.debitCents > 0 ? formatCents(line.debitCents) : '—'}
                </td>
                <td className="num">
                  {line.creditCents > 0 ? formatCents(line.creditCents) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="journal-explanation">
        <BookOpen size={16} aria-hidden />
        <p>
          <strong>Warum so gebucht?</strong> {entry.explanation}
        </p>
      </div>

      <p className="journal-primary-accounts">
        Primärkonten: Soll <AccountLabel number={entry.debitAccount} /> · Haben{' '}
        <AccountLabel number={entry.creditAccount} />
      </p>
    </article>
  )
}
