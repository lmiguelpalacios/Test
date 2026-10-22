import type { Customer, Product, SalesInvoice, SalesState } from '../types/sales'

export const demoCustomers: Customer[] = [
  {
    id: 'cust-001',
    number: 'K-1001',
    companyName: 'Küstenküche AG',
    contactName: 'Mara Jensen',
    billingAddress: 'Hafenstraße 12, 24103 Kiel',
    email: 'buchhaltung@kuestenkueche.example',
  },
  {
    id: 'cust-002',
    number: 'K-1002',
    companyName: 'Hafenmarkt OHG',
    contactName: 'Torben Kruse',
    billingAddress: 'Marktplatz 3, 23552 Lübeck',
    email: 'einkauf@hafenmarkt.example',
  },
  {
    id: 'cust-003',
    number: 'K-1003',
    companyName: 'Baltic Office GmbH',
    contactName: 'Svenja Holm',
    billingAddress: 'Holstenstraße 45, 24103 Kiel',
    email: 'office@baltic-office.example',
  },
  {
    id: 'cust-004',
    number: 'K-1004',
    companyName: 'Nordmeer Catering e.K.',
    contactName: 'Jonas Ahlers',
    billingAddress: 'Strandweg 8, 24340 Eckernförde',
  },
]

export const demoProducts: Product[] = [
  {
    id: 'prod-001',
    sku: 'A-100',
    name: 'Gastro-Geschirr Set Classic',
    description: '12-teiliges Set für Kantinen',
    netUnitPriceCents: 89_00,
    netPurchasePriceCents: 55_00,
    vatRate: 19,
    tracksStock: true,
    minStockQuantity: 20,
  },
  {
    id: 'prod-002',
    sku: 'A-220',
    name: 'Servietten Recycling 2-lagig',
    description: 'Karton à 2000 Stück',
    netUnitPriceCents: 24_50,
    netPurchasePriceCents: 14_50,
    vatRate: 19,
    tracksStock: true,
    minStockQuantity: 40,
  },
  {
    id: 'prod-003',
    sku: 'A-310',
    name: 'Bio-Gewürzmischung Nordisch',
    description: '500 g Gebinde',
    netUnitPriceCents: 12_80,
    netPurchasePriceCents: 7_20,
    vatRate: 7,
    tracksStock: true,
    minStockQuantity: 15,
  },
  {
    id: 'prod-004',
    sku: 'DL-010',
    name: 'Lieferung Region Kiel',
    description: 'Zustellung innerhalb 50 km',
    netUnitPriceCents: 35_00,
    netPurchasePriceCents: 0,
    vatRate: 19,
    tracksStock: false,
  },
]

/**
 * Demo-Rechnungen, abgestimmt auf Journal je-002 / je-004 / je-006 / je-007.
 * Nettobeträge entsprechen den gebuchten Erlösen; Journal-IDs verhindern Doppelbuchung.
 */
export const demoInvoices: SalesInvoice[] = [
  {
    id: 'inv-0142',
    number: 'RE-2026-0142',
    issueDate: '2026-10-02',
    dueDate: '2026-10-18',
    customerId: 'cust-001',
    lines: [
      {
        id: 'inv-0142-l1',
        productId: 'prod-001',
        description: 'Warenlieferung Küstenküche AG',
        quantity: 1,
        netUnitPriceCents: 4_050_42,
        vatRate: 19,
      },
    ],
    journalEntryIds: ['je-002'],
    bookedAt: '2026-10-02T09:30:00',
    createdAt: '2026-10-02T09:00:00',
    updatedAt: '2026-10-02T09:30:00',
  },
  {
    id: 'inv-0151',
    number: 'RE-2026-0151',
    issueDate: '2026-10-05',
    dueDate: '2026-10-22',
    customerId: 'cust-002',
    lines: [
      {
        id: 'inv-0151-l1',
        productId: 'prod-002',
        description: 'Warenlieferung Hafenmarkt OHG',
        quantity: 1,
        netUnitPriceCents: 1_803_78,
        vatRate: 19,
      },
    ],
    journalEntryIds: ['je-004'],
    bookedAt: '2026-10-05T14:15:00',
    createdAt: '2026-10-05T13:50:00',
    updatedAt: '2026-10-07T16:40:00',
  },
  {
    id: 'inv-0158',
    number: 'RE-2026-0158',
    issueDate: '2026-10-08',
    dueDate: '2026-10-28',
    customerId: 'cust-003',
    lines: [
      {
        id: 'inv-0158-l1',
        productId: 'prod-001',
        description: 'Warenlieferung Baltic Office GmbH',
        quantity: 1,
        netUnitPriceCents: 5_369_75,
        vatRate: 19,
      },
    ],
    journalEntryIds: ['je-007'],
    bookedAt: '2026-10-08T09:10:00',
    createdAt: '2026-10-08T08:40:00',
    updatedAt: '2026-10-08T09:10:00',
  },
  {
    id: 'inv-draft-001',
    number: 'RE-2026-0159',
    issueDate: '2026-10-09',
    dueDate: '2026-10-30',
    customerId: 'cust-004',
    lines: [
      {
        id: 'inv-draft-001-l1',
        productId: 'prod-002',
        description: 'Servietten Recycling 2-lagig',
        quantity: 20,
        netUnitPriceCents: 24_50,
        vatRate: 19,
      },
      {
        id: 'inv-draft-001-l2',
        productId: 'prod-003',
        description: 'Bio-Gewürzmischung Nordisch',
        quantity: 10,
        netUnitPriceCents: 12_80,
        vatRate: 7,
      },
    ],
    journalEntryIds: [],
    createdAt: '2026-10-09T10:00:00',
    updatedAt: '2026-10-09T10:00:00',
  },
]

export function createDemoSalesState(): SalesState {
  return {
    customers: demoCustomers.map((customer) => ({ ...customer })),
    products: demoProducts.map((product) => ({ ...product })),
    invoices: demoInvoices.map((invoice) => ({
      ...invoice,
      lines: invoice.lines.map((line) => ({ ...line })),
      journalEntryIds: [...invoice.journalEntryIds],
    })),
    payments: [
      {
        id: 'pay-0151-1',
        invoiceId: 'inv-0151',
        date: '2026-10-07',
        amountCents: 1_980_00,
        bankAccount: '1200',
        reference: 'ZE-2026-0044 Teilzahlung RE-2026-0151',
        journalEntryId: 'je-006',
        createdAt: '2026-10-07T16:40:00',
      },
    ],
    nextInvoiceSequence: 160,
  }
}

export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function formatInvoiceNumber(sequence: number): string {
  return `RE-2026-${String(sequence).padStart(4, '0')}`
}
