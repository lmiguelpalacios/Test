import { PlaceholderPage } from '../components/PlaceholderPage'

export function EinkaufPage() {
  return (
    <PlaceholderPage
      title="Einkauf"
      description="Bestellungen und Eingangsrechnungen von Lieferanten."
      plannedFeatures={[
        'Bestellanforderungen',
        'Eingangsrechnungen',
        'Lieferantenpreise',
        'Wareneingang verknüpfen',
      ]}
    />
  )
}
