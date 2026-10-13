import type { InvoiceStatus } from '../../types/sales'
import { INVOICE_STATUS_LABELS } from '../../sales/invoiceStatus'

const CLASS_BY_STATUS: Record<InvoiceStatus, string> = {
  entwurf: 'status-badge draft',
  offen: 'status-badge open',
  teilweise_bezahlt: 'status-badge partial',
  bezahlt: 'status-badge paid',
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span className={CLASS_BY_STATUS[status]}>{INVOICE_STATUS_LABELS[status]}</span>
  )
}
