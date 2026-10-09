import { PlaceholderPage } from '../components/PlaceholderPage'

export function LagerPage() {
  return (
    <PlaceholderPage
      title="Lager"
      description="Bestände, Artikel und Lagerbewegungen."
      plannedFeatures={[
        'Artikelstamm',
        'Bestandsübersicht',
        'Ein- und Auslagerungen',
        'Mindestbestandswarnungen',
      ]}
    />
  )
}
