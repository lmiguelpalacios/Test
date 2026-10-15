import { PlaceholderPage } from '../components/PlaceholderPage'

export function KontaktePage() {
  return (
    <PlaceholderPage
      title="Kontakte"
      description="Kunden, Lieferanten und sonstige Geschäftspartner."
      plannedFeatures={[
        'Kunden- und Lieferantenstammdaten',
        'Ansprechpartner',
        'Zahlungsbedingungen',
        'Kontaktverlauf',
      ]}
    />
  )
}
