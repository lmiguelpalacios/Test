import { Info } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="demo-banner" role="status">
      <Info size={16} aria-hidden />
      <span>
        Demo-Daten — keine echte Buchhaltung und keine Anbindung an eine Datenbank.
        Alle Kennzahlen dienen ausschließlich zu Übungs- und Anzeigezwecken.
      </span>
    </div>
  )
}
