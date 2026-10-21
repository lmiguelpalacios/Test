import {
  BarChart3,
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Settings,
  ShoppingBag,
  ShoppingCart,
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
  { id: 'berichte', label: 'Berichte', path: '/berichte', icon: BarChart3 },
  { id: 'lernmodus', label: 'Lernmodus', path: '/lernmodus', icon: GraduationCap },
  {
    id: 'einstellungen',
    label: 'Einstellungen',
    path: '/einstellungen',
    icon: Settings,
  },
]
