import type { Account } from '../types/accounting'

/**
 * Vereinfachter Lernkontenplan (an SKR 03 angelehnt).
 * Keine vollständige steuerliche Software — nur Übungszwecke.
 */
export const chartOfAccounts: Account[] = [
  // Anlagevermögen
  { number: '0420', name: 'Büroeinrichtung', type: 'aktiv', group: 'Anlagevermögen' },
  { number: '0650', name: 'Büroorganisation', type: 'aktiv', group: 'Anlagevermögen' },

  // Umlaufvermögen / Waren
  { number: '3980', name: 'Bestand Waren', type: 'aktiv', group: 'Umlaufvermögen' },

  // Finanzkonten
  { number: '1200', name: 'Bank', type: 'aktiv', group: 'Finanzkonten' },
  { number: '1000', name: 'Kasse', type: 'aktiv', group: 'Finanzkonten' },

  // Forderungen
  { number: '1400', name: 'Forderungen aus Lief. u. Leist.', type: 'aktiv', group: 'Forderungen' },

  // Verbindlichkeiten
  { number: '1600', name: 'Verbindlichkeiten aus Lief. u. Leist.', type: 'passiv', group: 'Verbindlichkeiten' },
  { number: '1800', name: 'Privatdarlehen / Sonstige Verbindlichkeiten', type: 'passiv', group: 'Verbindlichkeiten' },

  // Eigenkapital
  { number: '0800', name: 'Gezeichnetes Kapital', type: 'passiv', group: 'Eigenkapital' },
  { number: '0860', name: 'Gewinnvortrag', type: 'passiv', group: 'Eigenkapital' },

  // Erträge
  { number: '8400', name: 'Erlöse 19 % USt', type: 'ertrag', group: 'Erträge' },
  { number: '8300', name: 'Erlöse 7 % USt', type: 'ertrag', group: 'Erträge' },
  { number: '8000', name: 'Erlöse steuerfrei', type: 'ertrag', group: 'Erträge' },

  // Aufwendungen
  { number: '3400', name: 'Wareneingang 19 % Vorsteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '3300', name: 'Wareneingang 7 % Vorsteuer', type: 'aufwand', group: 'Aufwendungen' },
  { number: '4110', name: 'Löhne', type: 'aufwand', group: 'Aufwendungen' },
  { number: '4210', name: 'Miete', type: 'aufwand', group: 'Aufwendungen' },
  { number: '4920', name: 'Bürobedarf', type: 'aufwand', group: 'Aufwendungen' },
  { number: '4500', name: 'Fahrzeugkosten', type: 'aufwand', group: 'Aufwendungen' },
  { number: '4800', name: 'Reparaturen und Instandhaltung', type: 'aufwand', group: 'Aufwendungen' },

  // Steuerkonten
  { number: '1576', name: 'Abziehbare Vorsteuer 19 %', type: 'aktiv', group: 'Steuerkonten' },
  { number: '1571', name: 'Abziehbare Vorsteuer 7 %', type: 'aktiv', group: 'Steuerkonten' },
  { number: '1776', name: 'Umsatzsteuer 19 %', type: 'passiv', group: 'Steuerkonten' },
  { number: '1771', name: 'Umsatzsteuer 7 %', type: 'passiv', group: 'Steuerkonten' },
]

export const LEARNING_CHART_NOTICE =
  'Vereinfachter Lernkontenplan (an SKR 03 angelehnt) — keine vollständige steuerliche Software.'

export function getAccountMap(accounts: Account[] = chartOfAccounts): Map<string, Account> {
  return new Map(accounts.map((account) => [account.number, account]))
}

export function accountsByGroup(
  accounts: Account[] = chartOfAccounts,
): Map<string, Account[]> {
  const grouped = new Map<string, Account[]>()
  for (const account of accounts) {
    const list = grouped.get(account.group) ?? []
    list.push(account)
    grouped.set(account.group, list)
  }
  return grouped
}
