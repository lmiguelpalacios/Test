import { Link } from 'react-router-dom'
import {
  BookOpen,
  FileSpreadsheet,
  GraduationCap,
  Scale,
  ScrollText,
  WalletCards,
} from 'lucide-react'
import { useAccounting } from '../../accounting/AccountingContext'
import { REPORT_SIMPLIFICATION_NOTICE } from '../../reports/period'
import { DemoBanner } from '../DemoBanner'
import { PageHeader } from '../PageHeader'

export function ReportsOverview() {
  const { persistWarning, entries } = useAccounting()

  return (
    <div className="page-stack">
      <DemoBanner
        detail={
          persistWarning ??
          'Alle Berichte nutzen dasselbe gespeicherte Journal und die Belegdaten aus Verkauf/Einkauf.'
        }
      />
      <PageHeader
        title="Berichte"
        subtitle={`${entries.length} Journalbuchungen · lokale Lernauswertung`}
      />

      <section className="panel">
        <p className="panel-note">{REPORT_SIMPLIFICATION_NOTICE}</p>
        <div className="page-actions-row">
          <Link to="/berichte/susa" className="btn btn-primary">
            <FileSpreadsheet size={16} aria-hidden />
            Summen- und Saldenliste
          </Link>
          <Link to="/berichte/kontenblatt" className="btn btn-primary">
            <BookOpen size={16} aria-hidden />
            Kontenblatt
          </Link>
          <Link to="/berichte/guv" className="btn btn-secondary">
            <ScrollText size={16} aria-hidden />
            GuV
          </Link>
          <Link to="/berichte/bilanz" className="btn btn-secondary">
            <Scale size={16} aria-hidden />
            Bilanz
          </Link>
          <Link to="/berichte/offen" className="btn btn-secondary">
            <WalletCards size={16} aria-hidden />
            Offene Posten
          </Link>
          <Link to="/berichte/abschluss" className="btn btn-primary">
            <GraduationCap size={16} aria-hidden />
            Abschluss üben
          </Link>
        </div>
      </section>

      <section className="split-grid">
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Journalbasiert</h2>
          </div>
          <ul className="placeholder-list">
            <li>SuSa, Kontenblatt, GuV und Bilanz nur aus Buchungszeilen</li>
            <li>Keine erfundenen Kennzahlen oder Ausgleichsposten</li>
            <li>Ohne Eröffnungsbilanz bleiben Anfangssalden 0</li>
          </ul>
        </article>
        <article className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Belegbasiert</h2>
          </div>
          <ul className="placeholder-list">
            <li>Offene Posten aus gebuchten Kunden-/Lieferantenrechnungen</li>
            <li>Links zu den Belegdetails in Verkauf und Einkauf</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
