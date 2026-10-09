import {
  BarChart3,
  BookOpen,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { NavItemId } from '../types'

export interface NavItem {
  id: NavItemId
  label: string
  path: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { id: 'buchhaltung', label: 'Buchhaltung', path: '/buchhaltung', icon: BookOpen },
  { id: 'verkauf', label: 'Verkauf', path: '/verkauf', icon: ShoppingBag },
  { id: 'einkauf', label: 'Einkauf', path: '/einkauf', icon: ShoppingCart },
  { id: 'lager', label: 'Lager', path: '/lager', icon: Package },
  { id: 'kontakte', label: 'Kontakte', path: '/kontakte', icon: Users },
  { id: 'berichte', label: 'Berichte', path: '/berichte', icon: BarChart3 },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    path: '/einstellungen',
    icon: Settings,
  },
]
