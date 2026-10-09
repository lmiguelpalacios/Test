import type { Product } from '../types/sales'
import type { StockMovement } from '../types/purchase'

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
