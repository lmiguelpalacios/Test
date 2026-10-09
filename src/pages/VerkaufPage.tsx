import { PlaceholderPage } from '../components/PlaceholderPage'

export function VerkaufPage() {
  return (
    <PlaceholderPage
      title="Verkauf"
      description="Kundenaufträge, Angebote und Ausgangsrechnungen."
      plannedFeatures={[
        'Angebote und Aufträge',
        'Ausgangsrechnungen',
        'Lieferscheine',
        'Umsatzübersicht je Kunde',
      ]}
    />
  )
}
