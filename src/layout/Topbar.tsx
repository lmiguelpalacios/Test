import { Bell, Menu, Search } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ModeBadge } from '../components/ModeBadge'
import { companyInfo } from '../data/demo-data'
import { navItems } from './nav'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const location = useLocation()
  const { user, mode } = useAuth()
  const current =
    navItems.find((item) =>
      item.path === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.path),
    ) ?? navItems[0]

  const displayName = user?.email?.split('@')[0] ?? 'Lernende/r'
  const roleLabel = mode === 'local' ? 'Demo-Zugang' : 'Supabase'

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="icon-button menu-button"
          onClick={onMenuClick}
          aria-label="Navigation öffnen"
        >
          <Menu size={20} />
        </button>
        <div>
          <p className="topbar-section">{current.label}</p>
          <p className="topbar-period">{companyInfo.businessPeriod}</p>
        </div>
      </div>

      <div className="topbar-right">
        <ModeBadge compact />
        <label className="search-field">
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Suchen (Platzhalter)"
            disabled
            aria-label="Suche — Platzhalter"
          />
        </label>
        <button
          type="button"
          className="icon-button"
          disabled
          title="Benachrichtigungen — Platzhalter"
          aria-label="Benachrichtigungen — Platzhalter"
        >
          <Bell size={18} />
        </button>
        <div className="user-chip" title={user?.email ?? 'Lokaler Demo-Zugang'}>
          <span className="user-avatar" aria-hidden>
            NL
          </span>
          <span className="user-meta">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{roleLabel}</span>
          </span>
        </div>
      </div>
    </header>
  )
}
