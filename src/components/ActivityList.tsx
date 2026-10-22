import {
  FileText,
  Landmark,
  Package,
  ShoppingCart,
  Users,
} from 'lucide-react'
import type { ActivityItem, ActivityKind } from '../types'
import { formatCurrency, formatDateTime } from '../lib/format'

const kindIcon: Record<ActivityKind, typeof FileText> = {
  rechnung: FileText,
  zahlung: Landmark,
  einkauf: ShoppingCart,
  lager: Package,
  kontakt: Users,
}

interface ActivityListProps {
  items: ActivityItem[]
}

export function ActivityList({ items }: ActivityListProps) {
  return (
    <ul className="activity-list">
      {items.map((item) => {
        const Icon = kindIcon[item.kind]
        return (
          <li key={item.id} className="activity-item">
            <div className="activity-icon" aria-hidden>
              <Icon size={16} />
            </div>
            <div className="activity-body">
              <div className="activity-row">
                <p className="activity-title">{item.title}</p>
                {item.amount !== undefined ? (
                  <span className="activity-amount">
                    {formatCurrency(item.amount)}
                  </span>
                ) : null}
              </div>
              <p className="activity-description">{item.description}</p>
              <time className="activity-time" dateTime={item.occurredAt}>
                {formatDateTime(item.occurredAt)}
              </time>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
