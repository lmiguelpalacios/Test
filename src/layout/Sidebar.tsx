import { NavLink } from 'react-router-dom'
import { Building2, X } from 'lucide-react'
import { companyInfo } from '../data/demo-data'
import { navItems } from './nav'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Hauptnavigation">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden>
            <Building2 size={20} />
          </div>
          <div className="brand-text">
            <span className="brand-name">{companyInfo.name}</span>
            <span className="brand-tag">Übungsunternehmen</span>
          </div>
          <button
            type="button"
            className="sidebar-close"
            onClick={onClose}
            aria-label="Navigation schließen"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
                onClick={onClose}
              >
                <Icon size={18} aria-hidden />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="demo-chip">Demo-Modus</span>
          <p className="sidebar-footnote">Lokal ohne Backend lauffähig</p>
        </div>
      </aside>
    </>
  )
}
