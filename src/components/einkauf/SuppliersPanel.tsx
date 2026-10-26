import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function SuppliersPanel() {
  const { purchase, upsertSupplier } = useAccounting()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function startCreate() {
    setEditingId(null)
    setNumber(`L-${2000 + purchase.suppliers.length + 1}`)
    setCompanyName('')
    setContactName('')
    setBillingAddress('')
    setEmail('')
  }

  function startEdit(id: string) {
    const supplier = purchase.suppliers.find((item) => item.id === id)
    if (!supplier) return
    setEditingId(supplier.id)
    setNumber(supplier.number)
    setCompanyName(supplier.companyName)
    setContactName(supplier.contactName ?? '')
    setBillingAddress(supplier.billingAddress)
    setEmail(supplier.email ?? '')
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!number.trim() || !companyName.trim() || !billingAddress.trim()) {
      setMessage('Nummer, Firmenname und Adresse sind Pflicht.')
      return
    }
    upsertSupplier({
      id: editingId ?? undefined,
      number,
      companyName,
      contactName,
      billingAddress,
      email,
    })
    setMessage(editingId ? 'Lieferant aktualisiert.' : 'Lieferant angelegt.')
    startCreate()
  }

  return (
    <div className="page-stack">
      <DemoBanner />
      <PageHeader
        title="Lieferanten"
        subtitle="Stammdaten für Bestellungen und Eingangsrechnungen"
        actions={
          <Link to="/einkauf" className="btn btn-secondary">
            Zum Einkauf
          </Link>
        }
      />
      <section className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Liste</h2>
            <button type="button" className="btn btn-secondary" onClick={startCreate}>
              Neu
            </button>
          </div>
          <div className="table-scroll">
            <table className="data-table compact">
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Firma</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {purchase.suppliers.map((supplier) => (
                  <tr key={supplier.id}>
                    <td>
                      <code>{supplier.number}</code>
                    </td>
                    <td>
                      {supplier.companyName}
                      <br />
                      <span className="muted">{supplier.billingAddress}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => startEdit(supplier.id)}
                      >
                        Bearbeiten
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">
              {editingId ? 'Lieferant bearbeiten' : 'Lieferant anlegen'}
            </h2>
          </div>
          {message ? (
            <div className="form-alert success" role="status">
              {message}
            </div>
          ) : null}
          <form className="booking-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="form-field">
                <span>Nummer</span>
                <input value={number} onChange={(e) => setNumber(e.target.value)} required />
              </label>
              <label className="form-field">
                <span>Firmenname</span>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                />
              </label>
              <label className="form-field">
                <span>Ansprechpartner</span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>E-Mail</span>
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="form-field form-field-wide">
                <span>Rechnungsadresse</span>
                <input
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Speichern
              </button>
            </div>
          </form>
        </article>
      </section>
    </div>
  )
}
