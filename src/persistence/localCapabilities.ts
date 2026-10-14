import type { ModuleCapabilities } from './types'

export const LOCAL_CAPABILITIES: ModuleCapabilities = {
  manualJournal: true,
  salesMasterData: true,
  salesBookPay: true,
  purchaseMasterData: true,
  purchaseBookPay: true,
  goodsReceipt: true,
  learningProgress: true,
  learningPracticeJournal: true,
  workspaceImport: false,
  resetDemo: true,
}

/** Supabase mode: RPC-backed book/pay + allowed table writes; stubs stay off. */
export const SUPABASE_CAPABILITIES: ModuleCapabilities = {
  manualJournal: false,
  salesMasterData: true,
  salesBookPay: true,
  purchaseMasterData: true,
  purchaseBookPay: true,
  goodsReceipt: true,
  learningProgress: true,
  learningPracticeJournal: false,
  workspaceImport: true,
  resetDemo: false,
}
