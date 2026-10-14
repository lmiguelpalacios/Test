import type { SupabaseClient } from '@supabase/supabase-js'
import type { JournalLine, VatRate } from '../types/accounting'
import type { LearningState } from '../types/learning'
import type {
  GoodsReceipt,
  GoodsReceiptLine,
  PurchaseOrder,
  Supplier,
  VendorInvoice,
} from '../types/purchase'
import type { Customer, Product, SalesInvoice } from '../types/sales'
import { SUPABASE_CAPABILITIES } from './localCapabilities'
import {
  emptyPurchaseState,
  emptySalesState,
  mapCustomer,
  mapGoodsReceipt,
  mapInvoiceLine,
  mapJournalEntry,
  mapLearningProgress,
  mapProduct,
  mapPurchaseOrder,
  mapPurchaseOrderLine,
  mapSalesInvoice,
  mapSalesPayment,
  mapStockMovement,
  mapSupplier,
  mapVendorInvoice,
  mapVendorInvoiceLine,
  mapVendorPayment,
  rpcErrorMessage,
} from './supabaseMappers'
import type {
  ActionResult,
  PaymentInput,
  WorkspaceRepository,
  WorkspaceSnapshot,
} from './types'

function asVat(value: number): VatRate {
  if (value === 0 || value === 7 || value === 19) return value
  return 0
}

export class SupabaseWorkspaceRepository implements WorkspaceRepository {
  readonly mode = 'supabase' as const
  readonly capabilities = SUPABASE_CAPABILITIES
  private readonly client: SupabaseClient
  private readonly organizationId: string

  constructor(client: SupabaseClient, organizationId: string) {
    this.client = client
    this.organizationId = organizationId
  }

  async load(): Promise<WorkspaceSnapshot> {
    const orgId = this.organizationId
    const [
      journalRes,
      journalLinesRes,
      linksRes,
      customersRes,
      productsRes,
      invoiceRes,
      invoiceLinesRes,
      paymentsRes,
      suppliersRes,
      ordersRes,
      orderLinesRes,
      receiptsRes,
      receiptLinesRes,
      vendorInvRes,
      vendorLinesRes,
      vendorPayRes,
      stockRes,
      seqRes,
      learningRes,
    ] = await Promise.all([
      this.client.from('journal_entries').select('*').eq('organization_id', orgId),
      this.client.from('journal_lines').select('*').eq('organization_id', orgId),
      this.client
        .from('document_journal_links')
        .select('*')
        .eq('organization_id', orgId),
      this.client.from('customers').select('*').eq('organization_id', orgId),
      this.client.from('products').select('*').eq('organization_id', orgId),
      this.client.from('sales_invoices').select('*').eq('organization_id', orgId),
      this.client
        .from('sales_invoice_lines')
        .select('*')
        .eq('organization_id', orgId),
      this.client.from('sales_payments').select('*').eq('organization_id', orgId),
      this.client.from('suppliers').select('*').eq('organization_id', orgId),
      this.client.from('purchase_orders').select('*').eq('organization_id', orgId),
      this.client
        .from('purchase_order_lines')
        .select('*')
        .eq('organization_id', orgId),
      this.client.from('goods_receipts').select('*').eq('organization_id', orgId),
      this.client
        .from('goods_receipt_lines')
        .select('*')
        .eq('organization_id', orgId),
      this.client.from('vendor_invoices').select('*').eq('organization_id', orgId),
      this.client
        .from('vendor_invoice_lines')
        .select('*')
        .eq('organization_id', orgId),
      this.client.from('vendor_payments').select('*').eq('organization_id', orgId),
      this.client.from('stock_movements').select('*').eq('organization_id', orgId),
      this.client
        .from('document_sequences')
        .select('*')
        .eq('organization_id', orgId),
      this.client.from('learning_progress').select('*').eq('organization_id', orgId),
    ])

    const firstError = [
      journalRes,
      journalLinesRes,
      linksRes,
      customersRes,
      productsRes,
      invoiceRes,
      invoiceLinesRes,
      paymentsRes,
      suppliersRes,
      ordersRes,
      orderLinesRes,
      receiptsRes,
      receiptLinesRes,
      vendorInvRes,
      vendorLinesRes,
      vendorPayRes,
      stockRes,
      seqRes,
      learningRes,
    ].find((result) => result.error)

    if (firstError?.error) {
      return {
        entries: [],
        sales: emptySalesState(),
        purchase: emptyPurchaseState(),
        learning: { progress: [], totalPoints: 0 },
        source: 'empty',
        warning: `Supabase-Laden fehlgeschlagen: ${firstError.error.message}`,
      }
    }

    const linesByEntry = new Map<string, JournalLine[]>()
    for (const row of journalLinesRes.data ?? []) {
      const entryId = String(row.journal_entry_id)
      const list = linesByEntry.get(entryId) ?? []
      list.push({
        accountNumber: String(row.account_number),
        debitCents: Number(row.debit_cents),
        creditCents: Number(row.credit_cents),
      })
      linesByEntry.set(entryId, list)
    }

    const entries = (journalRes.data ?? []).map((row) =>
      mapJournalEntry(row, linesByEntry.get(String(row.id)) ?? []),
    )

    const linksByDoc = new Map<string, string[]>()
    for (const link of linksRes.data ?? []) {
      const key = `${link.document_type}:${link.document_id}`
      const list = linksByDoc.get(key) ?? []
      list.push(String(link.journal_entry_id))
      linksByDoc.set(key, list)
    }

    const invLinesByInv = new Map<string, ReturnType<typeof mapInvoiceLine>[]>()
    for (const row of invoiceLinesRes.data ?? []) {
      const invId = String(row.invoice_id)
      const list = invLinesByInv.get(invId) ?? []
      list.push(mapInvoiceLine(row))
      invLinesByInv.set(invId, list)
    }

    const invoices = (invoiceRes.data ?? []).map((row) => {
      const id = String(row.id)
      return mapSalesInvoice(
        row,
        invLinesByInv.get(id) ?? [],
        linksByDoc.get(`sales_invoice:${id}`) ?? [],
      )
    })

    const orderLinesByOrder = new Map<
      string,
      ReturnType<typeof mapPurchaseOrderLine>[]
    >()
    for (const row of orderLinesRes.data ?? []) {
      const orderId = String(row.order_id)
      const list = orderLinesByOrder.get(orderId) ?? []
      list.push(mapPurchaseOrderLine(row))
      orderLinesByOrder.set(orderId, list)
    }

    const orders = (ordersRes.data ?? []).map((row) =>
      mapPurchaseOrder(row, orderLinesByOrder.get(String(row.id)) ?? []),
    )

    const receiptLinesByReceipt = new Map<
      string,
      { orderLineId: string; quantity: number }[]
    >()
    for (const row of receiptLinesRes.data ?? []) {
      const receiptId = String(row.receipt_id)
      const list = receiptLinesByReceipt.get(receiptId) ?? []
      list.push({
        orderLineId: String(row.order_line_id),
        quantity: Number(row.quantity),
      })
      receiptLinesByReceipt.set(receiptId, list)
    }

    const receipts = (receiptsRes.data ?? []).map((row) =>
      mapGoodsReceipt(row, receiptLinesByReceipt.get(String(row.id)) ?? []),
    )

    const vendorLinesByInv = new Map<
      string,
      ReturnType<typeof mapVendorInvoiceLine>[]
    >()
    for (const row of vendorLinesRes.data ?? []) {
      const invId = String(row.invoice_id)
      const list = vendorLinesByInv.get(invId) ?? []
      list.push(mapVendorInvoiceLine(row))
      vendorLinesByInv.set(invId, list)
    }

    const vendorInvoices = (vendorInvRes.data ?? []).map((row) => {
      const id = String(row.id)
      return mapVendorInvoice(
        row,
        vendorLinesByInv.get(id) ?? [],
        linksByDoc.get(`vendor_invoice:${id}`) ?? [],
      )
    })

    const seq = new Map(
      (seqRes.data ?? []).map((row) => [String(row.kind), Number(row.next_value)]),
    )

    const sales = {
      customers: (customersRes.data ?? []).map(mapCustomer),
      products: (productsRes.data ?? []).map(mapProduct),
      invoices,
      payments: (paymentsRes.data ?? []).map(mapSalesPayment),
      nextInvoiceSequence: seq.get('sales_invoice') ?? 1,
    }

    const purchase = {
      suppliers: (suppliersRes.data ?? []).map(mapSupplier),
      orders,
      receipts,
      vendorInvoices,
      vendorPayments: (vendorPayRes.data ?? []).map(mapVendorPayment),
      stockMovements: (stockRes.data ?? []).map(mapStockMovement),
      nextOrderSequence: seq.get('purchase_order') ?? 1,
      nextReceiptSequence: seq.get('goods_receipt') ?? 1,
      nextVendorInvoiceSequence: seq.get('vendor_invoice') ?? 1,
    }

    return {
      entries,
      sales,
      purchase,
      learning: mapLearningProgress(learningRes.data ?? []),
      source: 'supabase',
    }
  }

  async bookSalesInvoice(invoiceId: string): Promise<ActionResult> {
    const { error } = await this.client.rpc('book_sales_invoice', {
      p_organization_id: this.organizationId,
      p_invoice_id: invoiceId,
    })
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true }
  }

  async recordSalesPayment(
    invoiceId: string,
    input: PaymentInput,
  ): Promise<ActionResult> {
    const { error } = await this.client.rpc('record_sales_payment', {
      p_organization_id: this.organizationId,
      p_invoice_id: invoiceId,
      p_payment_date: input.date,
      p_amount_cents: input.amountCents,
      p_bank_account: input.bankAccount,
      p_reference: input.reference?.trim() || null,
    })
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true }
  }

  async bookVendorInvoice(invoiceId: string): Promise<ActionResult> {
    const { error } = await this.client.rpc('book_vendor_invoice', {
      p_organization_id: this.organizationId,
      p_invoice_id: invoiceId,
    })
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true }
  }

  async recordVendorPayment(
    invoiceId: string,
    input: PaymentInput,
  ): Promise<ActionResult> {
    const { error } = await this.client.rpc('record_vendor_payment', {
      p_organization_id: this.organizationId,
      p_invoice_id: invoiceId,
      p_payment_date: input.date,
      p_amount_cents: input.amountCents,
      p_bank_account: input.bankAccount,
      p_reference: input.reference?.trim() || null,
    })
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true }
  }

  async recordGoodsReceipt(
    orderId: string,
    input: { receiptDate: string; lines: GoodsReceiptLine[] },
  ): Promise<ActionResult & { receipt?: GoodsReceipt }> {
    const { data, error } = await this.client.rpc('record_goods_receipt', {
      p_organization_id: this.organizationId,
      p_order_id: orderId,
      p_receipt_date: input.receiptDate,
      p_lines: input.lines.map((line) => ({
        order_line_id: line.orderLineId,
        quantity: line.quantity,
      })),
    })
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    const snapshot = await this.load()
    const receipt = snapshot.purchase.receipts.find((item) => item.id === String(data))
    return { ok: true, receipt }
  }

  async upsertCustomer(
    customer: Customer,
  ): Promise<ActionResult & { customer?: Customer }> {
    const row = {
      id: customer.id,
      organization_id: this.organizationId,
      number: customer.number,
      company_name: customer.companyName,
      contact_name: customer.contactName ?? null,
      billing_address: customer.billingAddress,
      email: customer.email ?? null,
    }
    const { data, error } = await this.client
      .from('customers')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true, customer: mapCustomer(data) }
  }

  async upsertProduct(
    product: Product,
  ): Promise<ActionResult & { product?: Product }> {
    const row = {
      id: product.id,
      organization_id: this.organizationId,
      sku: product.sku,
      name: product.name,
      description: product.description ?? null,
      net_unit_price_cents: product.netUnitPriceCents,
      net_purchase_price_cents: product.netPurchasePriceCents,
      vat_rate: product.vatRate,
      tracks_stock: product.tracksStock,
      min_stock_quantity: product.minStockQuantity ?? null,
    }
    const { data, error } = await this.client
      .from('products')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true, product: mapProduct(data) }
  }

  async upsertSupplier(
    supplier: Supplier,
  ): Promise<ActionResult & { supplier?: Supplier }> {
    const row = {
      id: supplier.id,
      organization_id: this.organizationId,
      number: supplier.number,
      company_name: supplier.companyName,
      contact_name: supplier.contactName ?? null,
      billing_address: supplier.billingAddress,
      email: supplier.email ?? null,
    }
    const { data, error } = await this.client
      .from('suppliers')
      .upsert(row, { onConflict: 'id' })
      .select('*')
      .single()
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true, supplier: mapSupplier(data) }
  }

  async saveDraftInvoice(
    invoice: SalesInvoice,
  ): Promise<ActionResult & { invoice?: SalesInvoice }> {
    const header = {
      id: invoice.id,
      organization_id: this.organizationId,
      number: invoice.number,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      customer_id: invoice.customerId,
      updated_at: new Date().toISOString(),
    }
    const { error: headerError } = await this.client
      .from('sales_invoices')
      .upsert(header, { onConflict: 'id' })
    if (headerError) return { ok: false, message: rpcErrorMessage(headerError) }

    await this.client
      .from('sales_invoice_lines')
      .delete()
      .eq('organization_id', this.organizationId)
      .eq('invoice_id', invoice.id)

    if (invoice.lines.length > 0) {
      const { error: linesError } = await this.client.from('sales_invoice_lines').insert(
        invoice.lines.map((line) => ({
          id: line.id,
          organization_id: this.organizationId,
          invoice_id: invoice.id,
          product_id: line.productId ?? null,
          description: line.description,
          quantity: line.quantity,
          net_unit_price_cents: line.netUnitPriceCents,
          vat_rate: line.vatRate,
        })),
      )
      if (linesError) return { ok: false, message: rpcErrorMessage(linesError) }
    }
    return { ok: true, invoice }
  }

  async saveVendorInvoice(
    invoice: VendorInvoice,
  ): Promise<ActionResult & { invoice?: VendorInvoice }> {
    const header = {
      id: invoice.id,
      organization_id: this.organizationId,
      external_number: invoice.externalNumber,
      internal_number: invoice.internalNumber,
      supplier_id: invoice.supplierId,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      order_id: invoice.orderId ?? null,
      updated_at: new Date().toISOString(),
    }
    const { error: headerError } = await this.client
      .from('vendor_invoices')
      .upsert(header, { onConflict: 'id' })
    if (headerError) return { ok: false, message: rpcErrorMessage(headerError) }

    await this.client
      .from('vendor_invoice_lines')
      .delete()
      .eq('organization_id', this.organizationId)
      .eq('invoice_id', invoice.id)

    if (invoice.lines.length > 0) {
      const { error: linesError } = await this.client
        .from('vendor_invoice_lines')
        .insert(
          invoice.lines.map((line) => ({
            id: line.id,
            organization_id: this.organizationId,
            invoice_id: invoice.id,
            product_id: line.productId ?? null,
            description: line.description,
            quantity: line.quantity,
            net_unit_price_cents: line.netUnitPriceCents,
            vat_rate: line.vatRate,
            expense_account: line.expenseAccount,
          })),
        )
      if (linesError) return { ok: false, message: rpcErrorMessage(linesError) }
    }
    return { ok: true, invoice }
  }

  async savePurchaseOrder(
    order: PurchaseOrder,
  ): Promise<ActionResult & { order?: PurchaseOrder }> {
    const header = {
      id: order.id,
      organization_id: this.organizationId,
      number: order.number,
      supplier_id: order.supplierId,
      order_date: order.orderDate,
      confirmed_at: order.confirmedAt ?? null,
      updated_at: new Date().toISOString(),
    }
    const { error: headerError } = await this.client
      .from('purchase_orders')
      .upsert(header, { onConflict: 'id' })
    if (headerError) return { ok: false, message: rpcErrorMessage(headerError) }

    await this.client
      .from('purchase_order_lines')
      .delete()
      .eq('organization_id', this.organizationId)
      .eq('order_id', order.id)

    if (order.lines.length > 0) {
      const { error: linesError } = await this.client.from('purchase_order_lines').insert(
        order.lines.map((line) => ({
          id: line.id,
          organization_id: this.organizationId,
          order_id: order.id,
          product_id: line.productId ?? null,
          description: line.description,
          quantity: line.quantity,
          net_unit_price_cents: line.netUnitPriceCents,
          vat_rate: line.vatRate,
          expense_account: line.expenseAccount,
        })),
      )
      if (linesError) return { ok: false, message: rpcErrorMessage(linesError) }
    }
    return { ok: true, order }
  }

  async confirmPurchaseOrder(orderId: string): Promise<ActionResult> {
    const { error } = await this.client
      .from('purchase_orders')
      .update({
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', this.organizationId)
      .eq('id', orderId)
      .is('confirmed_at', null)
    if (error) return { ok: false, message: rpcErrorMessage(error) }
    return { ok: true }
  }

  async saveLearningState(learning: LearningState): Promise<ActionResult> {
    const {
      data: { user },
    } = await this.client.auth.getUser()
    if (!user) return { ok: false, message: 'Nicht angemeldet.' }

    for (const item of learning.progress) {
      const { error } = await this.client.from('learning_progress').upsert(
        {
          organization_id: this.organizationId,
          user_id: user.id,
          task_id: item.taskId,
          attempts: item.attempts,
          best_score: item.bestScore,
          completed: item.completed,
          last_attempt_at: item.lastAttemptAt ?? null,
          practice_posted_at: item.practicePostedAt ?? null,
        },
        { onConflict: 'user_id,organization_id,task_id' },
      )
      if (error) return { ok: false, message: rpcErrorMessage(error) }
    }
    return { ok: true }
  }

  async importWorkspace(payload: {
    contentHash: string
    workspace: {
      entries: WorkspaceSnapshot['entries']
      sales: WorkspaceSnapshot['sales']
      purchase: WorkspaceSnapshot['purchase']
      learning: WorkspaceSnapshot['learning']
    }
    sourceLabel?: string
  }): Promise<ActionResult & { batchId?: string; alreadyImported?: boolean }> {
    const body = {
      version: 4,
      entries: payload.workspace.entries,
      sales: payload.workspace.sales,
      purchase: payload.workspace.purchase,
      learning: payload.workspace.learning,
    }
    const { data, error } = await this.client.rpc('import_workspace', {
      p_organization_id: this.organizationId,
      p_content_hash: payload.contentHash,
      p_payload: body,
      p_source_label: payload.sourceLabel ?? 'workspace-v4',
    })
    if (error) {
      if (/already_imported/i.test(error.message)) {
        return { ok: true, alreadyImported: true, batchId: undefined }
      }
      return { ok: false, message: rpcErrorMessage(error) }
    }
    return { ok: true, batchId: data ? String(data) : undefined }
  }
}

export function newUuid(): string {
  return crypto.randomUUID()
}

export function ensureUuid(id: string | undefined, fallback?: string): string {
  if (id && /^[0-9a-f-]{36}$/i.test(id)) return id
  return fallback ?? newUuid()
}

export { asVat }
