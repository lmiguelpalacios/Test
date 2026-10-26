import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { chartOfAccounts } from '../../data/chart-of-accounts'
import { useAccounting } from '../../accounting/AccountingContext'
import { calculateGrossCents, calculateTaxCents, isVatRate } from '../../accounting/vat'
import { formatCents, parseEuroInput } from '../../accounting/money'
import type { VatRate } from '../../types/accounting'

const VAT_OPTIONS: VatRate[] = [0, 7, 19]

export function JournalEntryForm() {
  const navigate = useNavigate()
  const { addEntry, vatEnabled } = useAccounting()

  const [date, setDate] = useState('2026-10-09')
  const [documentNumber, setDocumentNumber] = useState('')
  const [description, setDescription] = useState('')
  const [debitAccount, setDebitAccount] = useState('608')
  const [creditAccount, setCreditAccount] = useState('44')
  const [netInput, setNetInput] = useState('')
  const [vatRate, setVatRate] = useState<VatRate>(19)
  const [errors, setErrors] = useState<string[]>([])
  const [success, setSuccess] = useState<string | null>(null)

  const preview = useMemo(() => {
    const net = parseEuroInput(netInput)
    if (net === null || net <= 0) return null
    const rate = vatEnabled ? vatRate : 0
    const tax = calculateTaxCents(net, rate)
    const gross = calculateGrossCents(net, rate)
    return { net, tax, gross }
  }, [netInput, vatRate, vatEnabled])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSuccess(null)
    const netAmountCents = parseEuroInput(netInput)
    if (netAmountCents === null) {
      setErrors(['Bitte einen gültigen Nettobetrag eingeben (z. B. 100,00).'])
      return
    }

    const result = addEntry({
      date,
      documentNumber,
      description,
      debitAccount,
      creditAccount,
      netAmountCents,
      vatRate: vatEnabled ? vatRate : 0,
    })

    if (!result.ok) {
      setErrors(result.issues.map((issue) => issue.message))
      return
    }

    setErrors([])
    setSuccess(`Buchung ${result.entry.documentNumber} wurde gespeichert.`)
    setDocumentNumber('')
    setDescription('')
    setNetInput('')
    window.setTimeout(() => {
      navigate('/buchhaltung')
    }, 600)
  }

  return (
    <form className="panel booking-form" onSubmit={handleSubmit} noValidate>
      <div className="panel-header">
        <h2 className="panel-title">Neue Buchung erfassen</h2>
        <span className="panel-badge">Demo · lokal</span>
      </div>

      {errors.length > 0 ? (
        <div className="form-alert error" role="alert">
          <p>Die Buchung konnte nicht gespeichert werden:</p>
          <ul>
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {success ? (
        <div className="form-alert success" role="status">
          {success}
        </div>
      ) : null}

      <div className="form-grid">
        <label className="form-field">
          <span>Buchungsdatum</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Belegnummer</span>
          <input
            type="text"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            placeholder="z. B. RE-2026-0160"
            required
          />
        </label>

        <label className="form-field form-field-wide">
          <span>Beschreibung</span>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Kurz den Geschäftsvorfall beschreiben"
            required
          />
        </label>

        <label className="form-field">
          <span>Sollkonto</span>
          <select
            value={debitAccount}
            onChange={(event) => setDebitAccount(event.target.value)}
          >
            {chartOfAccounts.map((account) => (
              <option key={account.number} value={account.number}>
                {account.number} — {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Habenkonto</span>
          <select
            value={creditAccount}
            onChange={(event) => setCreditAccount(event.target.value)}
          >
            {chartOfAccounts.map((account) => (
              <option key={`c-${account.number}`} value={account.number}>
                {account.number} — {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          <span>Nettobetrag (€)</span>
          <input
            type="text"
            inputMode="decimal"
            value={netInput}
            onChange={(event) => setNetInput(event.target.value)}
            placeholder="0,00"
            required
          />
        </label>

        {vatEnabled ? (
          <label className="form-field">
            <span>USt-Satz</span>
            <select
              value={vatRate}
              onChange={(event) => {
                const value = Number(event.target.value)
                if (isVatRate(value)) setVatRate(value)
              }}
            >
              {VAT_OPTIONS.map((rate) => (
                <option key={rate} value={rate}>
                  {rate} %
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {vatEnabled ? (
        <div className="amount-preview">
          <div>
            <span className="muted">Steuerbetrag</span>
            <strong>{preview ? formatCents(preview.tax) : '—'}</strong>
          </div>
          <div>
            <span className="muted">Bruttobetrag</span>
            <strong>{preview ? formatCents(preview.gross) : '—'}</strong>
          </div>
        </div>
      ) : (
        <p className="panel-note">Betrag bleibt netto. Umsatzsteuer ist aus.</p>
      )}

      <p className="form-hint">
        {vatEnabled
          ? 'Bei Aufwandsbuchungen mit USt wird Vorsteuer automatisch im Soll ergänzt; bei Erlösen Umsatzsteuer im Haben. Soll und Haben müssen ausgeglichen sein — ungültige Buchungen werden abgelehnt.'
          : 'Neue Buchungen enthalten keine Vorsteuer- oder Umsatzsteuerzeilen. Soll und Haben müssen ausgeglichen sein.'}
      </p>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          Buchung speichern
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/buchhaltung')}
        >
          Abbrechen
        </button>
      </div>
    </form>
  )
}
