import type { Product } from '../types/sales'
import type {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  StockMovement,
} from '../types/purchase'

/** Bestandsbewegungen für einen Wareneingang (reine Funktion, kein Shared-State). */
export function buildGoodsReceiptStockMovements(input: {
  order: PurchaseOrder
  receipt: Pick<GoodsReceipt, 'id' | 'number' | 'receiptDate'>
  lines: GoodsReceiptLine[]
  products: Product[]
  createMovementId: () => string
  createdAt: string
}): StockMovement[] {
  const movements: StockMovement[] = []
  for (const line of input.lines) {
    const orderLine = input.order.lines.find((item) => item.id === line.orderLineId)
    if (!orderLine?.productId) continue
    const product = input.products.find((item) => item.id === orderLine.productId)
    if (!product?.tracksStock) continue
    movements.push({
      id: input.createMovementId(),
      productId: orderLine.productId,
      date: input.receipt.receiptDate,
      quantityDelta: line.quantity,
      sourceType: 'wareneingang',
      sourceId: input.receipt.id,
      note: input.receipt.number,
      createdAt: input.createdAt,
    })
  }
  return movements
}

export function stockQuantityForProduct(
  productId: string,
  movements: StockMovement[],
): number {
  return movements
    .filter((movement) => movement.productId === productId)
    .reduce((sum, movement) => sum + movement.quantityDelta, 0)
}

export function buildStockSnapshot(
  products: Product[],
  movements: StockMovement[],
): Array<{
  product: Product
  quantity: number
  belowMinimum: boolean
}> {
  return products
    .filter((product) => product.tracksStock)
    .map((product) => {
      const quantity = stockQuantityForProduct(product.id, movements)
      const belowMinimum =
        product.minStockQuantity !== undefined && quantity < product.minStockQuantity
      return { product, quantity, belowMinimum }
    })
}

export const STOCK_SIMPLIFICATION_NOTICE =
  'Vereinfachte Bestandssimulation: Wareneingang erhöht, gebuchte Verkaufsrechnungen mindern den Bestand. Keine periodengerechte Lagerbuchhaltung bei zeitlichem Auseinanderfallen von WE und Eingangsrechnung.'
