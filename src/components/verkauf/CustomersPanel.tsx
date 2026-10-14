import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAccounting } from '../../accounting/AccountingContext'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function CustomersPanel() {
  const { sales, upsertCustomer } = useAccounting()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [number, setNumber] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [billingAddress, setBillingAddress] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function startCreate() {
    setEditingId(null)
    setNumber(`K-${1000 + sales.customers.length + 1}`)
    setCompanyName('')
    setContactName('')
    setBillingAddress('')
    setEmail('')
    setMessage(null)
  }

  function startEdit(id: string) {
    const customer = sales.customers.find((item) => item.id === id)
    if (!customer) return
    setEditingId(customer.id)
    setNumber(customer.number)
    setCompanyName(customer.companyName)
    setContactName(customer.contactName ?? '')
    setBillingAddress(customer.billingAddress)
    setEmail(customer.email ?? '')
    setMessage(null)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!companyName.trim() || !billingAddress.trim() || !number.trim()) {
      setMessage('Kundennummer, Firmenname und Adresse sind Pflicht.')
      return
    }
    upsertCustomer({
      id: editingId ?? undefined,
      number,
      companyName,
      contactName,
      billingAddress,
      email,
    })
    setMessage(editingId ? 'Kunde aktualisiert.' : 'Kunde angelegt.')
    startCreate()
  }

  return (
    <div className="page-stack">
      <DemoBanner />
      <PageHeader
        title="Kunden"
        subtitle="Stammdaten für Ausgangsrechnungen"
        actions={
          <Link to="/verkauf" className="btn btn-secondary">
            Zum Verkauf
          </Link>
        }
      />

      <section className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Kundenliste</h2>
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
                {sales.customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>
                      <code>{customer.number}</code>
                    </td>
                    <td>
                      {customer.companyName}
                      <br />
                      <span className="muted">{customer.billingAddress}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => startEdit(customer.id)}
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
              {editingId ? 'Kunde bearbeiten' : 'Kunde anlegen'}
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
                <span>Kundennummer</span>
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
                <span>Ansprechpartner (optional)</span>
                <input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </label>
              <label className="form-field">
                <span>E-Mail (optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
