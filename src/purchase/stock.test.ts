import { describe, expect, it } from 'vitest'
import { createDemoPurchaseState } from '../data/purchase-demo'
import { createDemoSalesState } from '../data/sales-demo'
import {
  buildGoodsReceiptStockMovements,
  buildStockSnapshot,
  stockQuantityForProduct,
} from './stock'

describe('Bestandsbewegungen', () => {
  it('berechnet Bestand aus Bewegungen und markiert Mindestbestand', () => {
    const purchase = createDemoPurchaseState()
    const sales = createDemoSalesState()
    const qty001 = stockQuantityForProduct('prod-001', purchase.stockMovements)
    // 80 open + 40 GR - 12 - 18 = 90
    expect(qty001).toBe(90)

    const snapshot = buildStockSnapshot(sales.products, purchase.stockMovements)
    expect(snapshot.some((row) => row.product.id === 'prod-001')).toBe(true)
    expect(snapshot.every((row) => row.product.tracksStock)).toBe(true)
  })

  it('erzeugt WE-Bewegungen idempotent bei doppeltem Aufruf (Strict-Mode-sicher)', () => {
    const purchase = createDemoPurchaseState()
    const sales = createDemoSalesState()
    const order = purchase.orders.find((item) => item.id === 'po-draft-001')!
    const confirmed = { ...order, confirmedAt: '2026-10-09T12:00:00' }
    const lines = [{ orderLineId: 'po-draft-001-l1', quantity: 10 }]
    const receipt = {
      id: 'gr-test',
      number: 'WE-TEST-1',
      receiptDate: '2026-10-09',
    }

    let counter = 0
    const createMovementId = () => `sm-t-${++counter}`

    const runOnce = () =>
      buildGoodsReceiptStockMovements({
        order: confirmed,
        receipt,
        lines,
        products: sales.products,
        createMovementId,
        createdAt: '2026-10-09T12:00:00',
      })

    // Zwei unabhängige Aufrufe (wie zwei Updater-Läufe) erzeugen je eigene Listen —
    // nur das Ergebnis des letzten Laufs darf übernommen werden (kein Shared-Push).
    const first = runOnce()
    const second = runOnce()
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(1)
    expect(first[0]!.quantityDelta).toBe(10)
    expect(second[0]!.sourceId).toBe('gr-test')
    expect(first[0]!.id).not.toBe(second[0]!.id)

    // Anti-Pattern-Nachweis: Shared-Array + doppelter Push verdoppelt Bestand.
    const shared: ReturnType<typeof buildGoodsReceiptStockMovements> = []
    shared.push(...first)
    shared.push(...second)
    expect(shared).toHaveLength(2)
    expect(
      stockQuantityForProduct(
        'prod-003',
        [...purchase.stockMovements, ...shared],
      ) - stockQuantityForProduct('prod-003', purchase.stockMovements),
    ).toBe(20)
  })
})
