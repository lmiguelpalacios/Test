import { Construction } from 'lucide-react'
import { PageHeader } from './PageHeader'
import { DemoBanner } from './DemoBanner'

interface PlaceholderPageProps {
  title: string
  description: string
  plannedFeatures: string[]
}

export function PlaceholderPage({
  title,
  description,
  plannedFeatures,
}: PlaceholderPageProps) {
  return (
    <div className="page-stack">
      <DemoBanner />
      <PageHeader title={title} subtitle={description} />
      <section className="panel placeholder-panel">
        <div className="placeholder-icon" aria-hidden>
          <Construction size={28} />
        </div>
        <h2 className="placeholder-title">Platzhalter — noch nicht implementiert</h2>
        <p className="placeholder-text">
          Dieser Bereich ist navigierbar und strukturell vorbereitet. Fachliche Funktionen
          folgen in späteren Ausbaustufen.
        </p>
        <ul className="placeholder-list">
          {plannedFeatures.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
