import { describe, expect, it } from 'vitest'
import { createDemoPurchaseState } from '../data/purchase-demo'
import { createDemoSalesState } from '../data/sales-demo'
import { buildStockSnapshot, stockQuantityForProduct } from './stock'

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
})
