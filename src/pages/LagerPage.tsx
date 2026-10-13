import { Link } from 'react-router-dom'
import { DemoBanner } from '../components/DemoBanner'
import { PageHeader } from '../components/PageHeader'

export function LagerPage() {
  return (
    <div className="page-stack">
      <DemoBanner detail="Bestand wird über Bewegungen aus Wareneingang und Verkauf geführt — nicht als unabhängiges Zahlenfeld." />
      <PageHeader
        title="Lager"
        subtitle="Gemeinsame Bestandsübersicht liegt im Einkauf"
        actions={
          <Link to="/einkauf/produkte" className="btn btn-primary">
            Zu Produkte / Bestände
          </Link>
        }
      />
      <section className="panel">
        <p className="panel-note">
          Dedizierte Lagerorte, Chargen und Inventurkorrekturen sind noch nicht
          vorgesehen. Die aktuelle Bestandsführung deckt Wareneingang (+) und
          gebuchten Verkauf (−) ab.
        </p>
      </section>
    </div>
  )
}
