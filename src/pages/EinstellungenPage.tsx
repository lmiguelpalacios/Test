import { PlaceholderPage } from '../components/PlaceholderPage'

export function EinstellungenPage() {
  return (
    <PlaceholderPage
      title="Einstellungen"
      description="Unternehmen, Benutzer und Systemparameter."
      plannedFeatures={[
        'Unternehmensstammdaten',
        'Geschäftsjahr und Perioden',
        'Benutzerkonten (später)',
        'Supabase-/Backend-Anbindung (vorbereitet, nicht aktiv)',
      ]}
    />
  )
}
