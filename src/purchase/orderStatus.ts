import type {
  GoodsReceipt,
  PurchaseOrder,
  PurchaseOrderStatus,
} from '../types/purchase'

export function receivedQuantityForLine(
  orderId: string,
  orderLineId: string,
  receipts: GoodsReceipt[],
): number {
  return receipts
    .filter((receipt) => receipt.orderId === orderId)
    .flatMap((receipt) => receipt.lines)
    .filter((line) => line.orderLineId === orderLineId)
    .reduce((sum, line) => sum + line.quantity, 0)
}

export function derivePurchaseOrderStatus(
  order: PurchaseOrder,
  receipts: GoodsReceipt[],
): PurchaseOrderStatus {
  if (!order.confirmedAt) return 'entwurf'

  let anyReceived = false
  let allComplete = true
  for (const line of order.lines) {
    const received = receivedQuantityForLine(order.id, line.id, receipts)
    if (received > 0) anyReceived = true
    if (received < line.quantity) allComplete = false
  }

  if (!anyReceived) return 'bestellt'
  if (allComplete) return 'vollstaendig_geliefert'
  return 'teilweise_geliefert'
}

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  entwurf: 'Entwurf',
  bestellt: 'Bestellt',
  teilweise_geliefert: 'Teilweise geliefert',
  vollstaendig_geliefert: 'Vollständig geliefert',
}

export function remainingQuantityForLine(
  order: PurchaseOrder,
  orderLineId: string,
  receipts: GoodsReceipt[],
): number {
  const line = order.lines.find((item) => item.id === orderLineId)
  if (!line) return 0
  return Math.max(0, line.quantity - receivedQuantityForLine(order.id, orderLineId, receipts))
}
