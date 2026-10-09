import { PlaceholderPage } from '../components/PlaceholderPage'

export function BerichtePage() {
  return (
    <PlaceholderPage
      title="Berichte"
      description="Auswertungen wie Bilanz, GuV und Kennzahlen."
      plannedFeatures={[
        'Gewinn- und Verlustrechnung',
        'Bilanz (vereinfacht)',
        'Liquiditätsübersicht',
        'Periodenvergleiche',
      ]}
    />
  )
}
