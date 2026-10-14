import { Info } from 'lucide-react'

interface DemoBannerProps {
  /** Zusätzlicher Hinweis z. B. zu localStorage. */
  detail?: string
}

export function DemoBanner({ detail }: DemoBannerProps) {
  return (
    <div className="demo-banner" role="status">
      <Info size={16} aria-hidden />
      <span>
        Lokaler Demo-Modus — keine echte Buchhaltung und kein Backend/Supabase.
        Übungsdaten liegen bei Bedarf im Browser (localStorage).
        {detail ? ` ${detail}` : ''}
      </span>
    </div>
  )
}
