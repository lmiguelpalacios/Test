import { Info } from 'lucide-react'
import { useAccounting } from '../accounting/AccountingContext'

interface DemoBannerProps {
  /** Zusätzlicher Hinweis z. B. zu localStorage. */
  detail?: string
}

export function DemoBanner({ detail }: DemoBannerProps) {
  const { isLocalDemoMode, dataMode } = useAccounting()

  if (!isLocalDemoMode) {
    return (
      <div className="demo-banner demo-banner-online" role="status">
        <Info size={16} aria-hidden />
        <span>
          Supabase-Modus ({dataMode}) — Buchungen/Zahlungen über RPC; kein
          localStorage-Hybrid.
          {detail ? ` ${detail}` : ''}
        </span>
      </div>
    )
  }

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
