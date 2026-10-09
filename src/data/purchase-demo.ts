import type {
  GoodsReceipt,
  PurchaseOrder,
  PurchaseState,
  StockMovement,
  Supplier,
  VendorInvoice,
} from '../types/purchase'

export const demoSuppliers: Supplier[] = [
  {
    id: 'sup-001',
    number: 'L-2001',
    companyName: 'Nordsee Logistik SE',
    contactName: 'Henrik Vogt',
    billingAddress: 'Kai 7, 27568 Bremerhaven',
    email: 'rechnung@nordsee-logistik.example',
  },
  {
    id: 'sup-002',
    number: 'L-2002',
    companyName: 'Ostsee Papier & Pack',
    contactName: 'Lena Bruns',
    billingAddress: 'Industrieweg 14, 23556 Lübeck',
    email: 'service@ostsee-papier.example',
  },
  {
    id: 'sup-003',
    number: 'L-2003',
    companyName: 'Mitte Holstein Großhandel e.K.',
    contactName: 'Paul Meins',
    billingAddress: 'Bahnhofstraße 2, 24534 Neumünster',
  },
]

export const demoPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-001',
    number: 'BE-2026-0001',
    supplierId: 'sup-001',
    orderDate: '2026-09-25',
    confirmedAt: '2026-09-25T10:00:00',
    lines: [
      {
        id: 'po-001-l1',
        productId: 'prod-001',
        description: 'Gastro-Geschirr Set Classic',
        quantity: 40,
        netUnitPriceCents: 55_00,
        vatRate: 19,
        expenseAccount: '3400',
      },
    ],
    createdAt: '2026-09-25T09:30:00',
    updatedAt: '2026-10-01T08:00:00',
  },
  {
    id: 'po-002',
    number: 'BE-2026-0002',
    supplierId: 'sup-002',
    orderDate: '2026-10-02',
    confirmedAt: '2026-10-02T11:00:00',
    lines: [
      {
        id: 'po-002-l1',
        productId: 'prod-002',
        description: 'Servietten Recycling 2-lagig',
        quantity: 80,
        netUnitPriceCents: 14_50,
        vatRate: 19,
        expenseAccount: '3400',
      },
      {
        id: 'po-002-l2',
        description: 'Verpackungsmaterial Zusatz',
        quantity: 1,
        netUnitPriceCents: 416_81,
        vatRate: 19,
        expenseAccount: '4920',
      },
    ],
    createdAt: '2026-10-02T10:40:00',
    updatedAt: '2026-10-06T10:20:00',
  },
  {
    id: 'po-draft-001',
    number: 'BE-2026-0003',
    supplierId: 'sup-003',
    orderDate: '2026-10-09',
    lines: [
      {
        id: 'po-draft-001-l1',
        productId: 'prod-003',
        description: 'Bio-Gewürzmischung Nordisch',
        quantity: 50,
        netUnitPriceCents: 7_20,
        vatRate: 7,
        expenseAccount: '3300',
      },
    ],
    createdAt: '2026-10-09T11:00:00',
    updatedAt: '2026-10-09T11:00:00',
  },
]

export const demoGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'gr-001',
    number: 'WE-2026-0001',
    orderId: 'po-001',
    receiptDate: '2026-10-01',
    lines: [{ orderLineId: 'po-001-l1', quantity: 40 }],
    createdAt: '2026-10-01T07:45:00',
  },
  {
    id: 'gr-002',
    number: 'WE-2026-0002',
    orderId: 'po-002',
    receiptDate: '2026-10-06',
    lines: [
      { orderLineId: 'po-002-l1', quantity: 80 },
      { orderLineId: 'po-002-l2', quantity: 1 },
    ],
    createdAt: '2026-10-06T09:50:00',
  },
]

/** Eingangsrechnungen abgestimmt auf Journal je-001 / je-005 / je-008. */
export const demoVendorInvoices: VendorInvoice[] = [
  {
    id: 'vinv-0088',
    externalNumber: 'NL-45821',
    internalNumber: 'ER-2026-0088',
    supplierId: 'sup-001',
    issueDate: '2026-10-01',
    dueDate: '2026-10-15',
    orderId: 'po-001',
    lines: [
      {
        id: 'vinv-0088-l1',
        productId: 'prod-001',
        description: 'Wareneinkauf Nordsee Logistik SE',
        quantity: 1,
        netUnitPriceCents: 2_739_50,
        vatRate: 19,
        expenseAccount: '3400',
      },
    ],
    journalEntryIds: ['je-001'],
    bookedAt: '2026-10-01T08:00:00',
    createdAt: '2026-10-01T07:50:00',
    updatedAt: '2026-10-08T15:00:00',
  },
  {
    id: 'vinv-0094',
    externalNumber: 'OPP-99201',
    internalNumber: 'ER-2026-0094',
    supplierId: 'sup-002',
    issueDate: '2026-10-06',
    dueDate: '2026-10-20',
    orderId: 'po-002',
    lines: [
      {
        id: 'vinv-0094-l1',
        description: 'Verpackungsmaterial Ostsee Papier & Pack',
        quantity: 1,
        netUnitPriceCents: 1_576_81,
        vatRate: 19,
        expenseAccount: '4920',
      },
    ],
    journalEntryIds: ['je-005'],
    bookedAt: '2026-10-06T10:20:00',
    createdAt: '2026-10-06T10:10:00',
    updatedAt: '2026-10-06T10:20:00',
  },
]

export const demoStockMovements: StockMovement[] = [
  {
    id: 'sm-open-001',
    productId: 'prod-001',
    date: '2026-01-01',
    quantityDelta: 80,
    sourceType: 'anfangsbestand',
    sourceId: 'open-2026',
    note: 'Anfangsbestand Geschäftsjahr',
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 'sm-open-002',
    productId: 'prod-002',
    date: '2026-01-01',
    quantityDelta: 120,
    sourceType: 'anfangsbestand',
    sourceId: 'open-2026',
    note: 'Anfangsbestand Geschäftsjahr',
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 'sm-open-003',
    productId: 'prod-003',
    date: '2026-01-01',
    quantityDelta: 60,
    sourceType: 'anfangsbestand',
    sourceId: 'open-2026',
    note: 'Anfangsbestand Geschäftsjahr',
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 'sm-gr-001',
    productId: 'prod-001',
    date: '2026-10-01',
    quantityDelta: 40,
    sourceType: 'wareneingang',
    sourceId: 'gr-001',
    note: 'WE-2026-0001',
    createdAt: '2026-10-01T07:45:00',
  },
  {
    id: 'sm-gr-002',
    productId: 'prod-002',
    date: '2026-10-06',
    quantityDelta: 80,
    sourceType: 'wareneingang',
    sourceId: 'gr-002',
    note: 'WE-2026-0002',
    createdAt: '2026-10-06T09:50:00',
  },
  {
    id: 'sm-sale-0142',
    productId: 'prod-001',
    date: '2026-10-02',
    quantityDelta: -12,
    sourceType: 'verkauf',
    sourceId: 'inv-0142',
    note: 'RE-2026-0142 (vereinfachte Abgangsmenge)',
    createdAt: '2026-10-02T09:30:00',
  },
  {
    id: 'sm-sale-0151',
    productId: 'prod-002',
    date: '2026-10-05',
    quantityDelta: -25,
    sourceType: 'verkauf',
    sourceId: 'inv-0151',
    note: 'RE-2026-0151 (vereinfachte Abgangsmenge)',
    createdAt: '2026-10-05T14:15:00',
  },
  {
    id: 'sm-sale-0158',
    productId: 'prod-001',
    date: '2026-10-08',
    quantityDelta: -18,
    sourceType: 'verkauf',
    sourceId: 'inv-0158',
    note: 'RE-2026-0158 (vereinfachte Abgangsmenge)',
    createdAt: '2026-10-08T09:10:00',
  },
]

export function createDemoPurchaseState(): PurchaseState {
  return {
    suppliers: demoSuppliers.map((s) => ({ ...s })),
    orders: demoPurchaseOrders.map((order) => ({
      ...order,
      lines: order.lines.map((line) => ({ ...line })),
    })),
    receipts: demoGoodsReceipts.map((receipt) => ({
      ...receipt,
      lines: receipt.lines.map((line) => ({ ...line })),
    })),
    vendorInvoices: demoVendorInvoices.map((invoice) => ({
      ...invoice,
      lines: invoice.lines.map((line) => ({ ...line })),
      journalEntryIds: [...invoice.journalEntryIds],
    })),
    vendorPayments: [
      {
        id: 'vpay-0088-1',
        invoiceId: 'vinv-0088',
        date: '2026-10-08',
        amountCents: 3_260_00,
        bankAccount: '1200',
        reference: 'ZA-2026-0031 Begleichung ER-2026-0088',
        journalEntryId: 'je-008',
        createdAt: '2026-10-08T15:00:00',
      },
    ],
    stockMovements: demoStockMovements.map((movement) => ({ ...movement })),
    nextOrderSequence: 4,
    nextReceiptSequence: 3,
    nextVendorInvoiceSequence: 95,
  }
}

export function formatPurchaseOrderNumber(sequence: number): string {
  return `BE-2026-${String(sequence).padStart(4, '0')}`
}

export function formatGoodsReceiptNumber(sequence: number): string {
  return `WE-2026-${String(sequence).padStart(4, '0')}`
}

export function formatVendorInvoiceNumber(sequence: number): string {
  return `ER-2026-${String(sequence).padStart(4, '0')}`
}
