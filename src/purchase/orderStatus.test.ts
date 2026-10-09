import { describe, expect, it } from 'vitest'
import { demoGoodsReceipts, demoPurchaseOrders } from '../data/purchase-demo'
import {
  derivePurchaseOrderStatus,
  receivedQuantityForLine,
  remainingQuantityForLine,
} from './orderStatus'

describe('Bestellstatus / Teillieferungen', () => {
  it('leitet Status aus Bestätigung und Wareneingängen ab', () => {
    const draft = demoPurchaseOrders.find((order) => !order.confirmedAt)!
    expect(derivePurchaseOrderStatus(draft, [])).toBe('entwurf')

    const ordered = { ...draft, confirmedAt: '2026-10-09T12:00:00' }
    expect(derivePurchaseOrderStatus(ordered, [])).toBe('bestellt')

    const po1 = demoPurchaseOrders.find((order) => order.id === 'po-001')!
    expect(derivePurchaseOrderStatus(po1, demoGoodsReceipts)).toBe(
      'vollstaendig_geliefert',
    )
  })

  it('verhindert Überlieferung über Restmenge', () => {
    const po1 = demoPurchaseOrders.find((order) => order.id === 'po-001')!
    expect(receivedQuantityForLine(po1.id, 'po-001-l1', demoGoodsReceipts)).toBe(40)
    expect(remainingQuantityForLine(po1, 'po-001-l1', demoGoodsReceipts)).toBe(0)
  })
})
