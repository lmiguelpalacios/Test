import {
  loadWorkspace,
  resetWorkspace,
  saveWorkspace,
  type StorageLike,
} from '../accounting/journalStore'
import { LOCAL_CAPABILITIES } from './localCapabilities'
import type {
  ActionResult,
  PaymentInput,
  WorkspaceRepository,
  WorkspaceSnapshot,
} from './types'

/**
 * Demo repository: delegates persistence to journalStore (Workspace v5).
 * Booking/payment mutations stay in AccountingContext (same as today);
 * this adapter exposes load/save/reset for the dual-mode seam.
 */
export class LocalWorkspaceRepository implements WorkspaceRepository {
  readonly mode = 'local' as const
  readonly capabilities = LOCAL_CAPABILITIES
  private readonly storage: StorageLike

  constructor(storage: StorageLike) {
    this.storage = storage
  }

  async load(): Promise<WorkspaceSnapshot> {
    const loaded = loadWorkspace(this.storage)
    return {
      entries: loaded.entries,
      sales: loaded.sales,
      purchase: loaded.purchase,
      learning: loaded.learning,
      vatEnabled: loaded.vatEnabled,
      source: loaded.source,
      warning: loaded.warning,
    }
  }

  async saveSnapshot(
    snapshot: Omit<WorkspaceSnapshot, 'source' | 'warning'>,
  ): Promise<void> {
    saveWorkspace(
      {
        entries: snapshot.entries,
        sales: snapshot.sales,
        purchase: snapshot.purchase,
        learning: snapshot.learning,
        vatEnabled: snapshot.vatEnabled,
      },
      this.storage,
    )
  }

  async resetToDemo(): Promise<WorkspaceSnapshot> {
    const demo = resetWorkspace(this.storage)
    return {
      entries: demo.entries,
      sales: demo.sales,
      purchase: demo.purchase,
      learning: demo.learning,
      vatEnabled: demo.vatEnabled,
      source: 'demo',
    }
  }

  async bookSalesInvoice(_invoiceId: string): Promise<ActionResult> {
    return {
      ok: false,
      message: 'Lokaler Demo-Modus: Buchung läuft über AccountingContext.',
    }
  }

  async recordSalesPayment(
    _invoiceId: string,
    _input: PaymentInput,
  ): Promise<ActionResult> {
    return {
      ok: false,
      message: 'Lokaler Demo-Modus: Zahlung läuft über AccountingContext.',
    }
  }

  async bookVendorInvoice(_invoiceId: string): Promise<ActionResult> {
    return {
      ok: false,
      message: 'Lokaler Demo-Modus: ER-Buchung läuft über AccountingContext.',
    }
  }

  async recordVendorPayment(
    _invoiceId: string,
    _input: PaymentInput,
  ): Promise<ActionResult> {
    return {
      ok: false,
      message: 'Lokaler Demo-Modus: ZA läuft über AccountingContext.',
    }
  }
}
