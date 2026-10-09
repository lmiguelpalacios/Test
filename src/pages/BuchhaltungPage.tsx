import { PlaceholderPage } from '../components/PlaceholderPage'

export function BuchhaltungPage() {
  return (
    <PlaceholderPage
      title="Buchhaltung"
      description="Erfassung und Auswertung von Geschäftsvorfällen."
      plannedFeatures={[
        'Kontenplan und Journalbuchungen',
        'Offene-Posten-Verwaltung',
        'Zahlungsabgleich',
        'Doppelte Buchführung (später)',
      ]}
    />
  )
}
