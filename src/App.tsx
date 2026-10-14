import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AccountingProvider } from './accounting/AccountingContext'
import { AuthProvider } from './auth/AuthContext'
import { OrgProvider } from './auth/OrgContext'
import { AuthGate } from './components/auth/AuthGate'
import { AppLayout } from './layout/AppLayout'
import { DataBackendProvider } from './persistence/DataBackendContext'
import {
  AccountLedgerPage,
  BalanceSheetPage,
  BerichteLayout,
  BerichteOverviewPage,
  IncomeStatementPage,
  OpenItemsPage,
  TrialBalancePage,
} from './pages/BerichtePage'
import {
  BuchhaltungLayout,
  BuchhaltungOverviewPage,
  ChartOfAccountsPage,
  NewEntryPage,
} from './pages/BuchhaltungPage'
import { DashboardPage } from './pages/DashboardPage'
import {
  EinkaufLayout,
  EinkaufOverviewPage,
  GoodsReceiptsPage,
  NewOrderPage,
  NewVendorInvoicePage,
  OrderDetailPage,
  OrdersPage,
  PurchaseProductsPage,
  SuppliersPage,
  VendorInvoiceDetailPage,
  VendorInvoicesPage,
  VendorPaymentsPage,
} from './pages/EinkaufPage'
import { EinstellungenPage } from './pages/EinstellungenPage'
import { KontaktePage } from './pages/KontaktePage'
import { LagerPage } from './pages/LagerPage'
import {
  LernmodusLayout,
  LernmodusOverviewPage,
  LernmodusTaskPage,
} from './pages/LernmodusPage'
import {
  CustomersPage,
  InvoiceDetailPage,
  NewInvoicePage,
  ProductsPage,
  VerkaufLayout,
  VerkaufOverviewPage,
} from './pages/VerkaufPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrgProvider>
          <DataBackendProvider>
            <AuthGate>
              <AccountingProvider>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="buchhaltung" element={<BuchhaltungLayout />}>
                      <Route index element={<BuchhaltungOverviewPage />} />
                      <Route path="kontenplan" element={<ChartOfAccountsPage />} />
                      <Route path="neu" element={<NewEntryPage />} />
                    </Route>
                    <Route path="verkauf" element={<VerkaufLayout />}>
                      <Route index element={<VerkaufOverviewPage />} />
                      <Route path="neu" element={<NewInvoicePage />} />
                      <Route
                        path="rechnungen/:invoiceId"
                        element={<InvoiceDetailPage />}
                      />
                      <Route path="kunden" element={<CustomersPage />} />
                      <Route path="produkte" element={<ProductsPage />} />
                    </Route>
                    <Route path="einkauf" element={<EinkaufLayout />}>
                      <Route index element={<EinkaufOverviewPage />} />
                      <Route path="bestellungen" element={<OrdersPage />} />
                      <Route path="bestellungen/neu" element={<NewOrderPage />} />
                      <Route
                        path="bestellungen/:orderId"
                        element={<OrderDetailPage />}
                      />
                      <Route path="wareneingaenge" element={<GoodsReceiptsPage />} />
                      <Route path="rechnungen" element={<VendorInvoicesPage />} />
                      <Route path="rechnungen/neu" element={<NewVendorInvoicePage />} />
                      <Route
                        path="rechnungen/:invoiceId"
                        element={<VendorInvoiceDetailPage />}
                      />
                      <Route path="zahlungen" element={<VendorPaymentsPage />} />
                      <Route path="lieferanten" element={<SuppliersPage />} />
                      <Route path="produkte" element={<PurchaseProductsPage />} />
                    </Route>
                    <Route path="lager" element={<LagerPage />} />
                    <Route path="kontakte" element={<KontaktePage />} />
                    <Route path="berichte" element={<BerichteLayout />}>
                      <Route index element={<BerichteOverviewPage />} />
                      <Route path="susa" element={<TrialBalancePage />} />
                      <Route path="kontenblatt" element={<AccountLedgerPage />} />
                      <Route
                        path="kontenblatt/:accountNumber"
                        element={<AccountLedgerPage />}
                      />
                      <Route path="guv" element={<IncomeStatementPage />} />
                      <Route path="bilanz" element={<BalanceSheetPage />} />
                      <Route path="offen" element={<OpenItemsPage />} />
                    </Route>
                    <Route path="lernmodus" element={<LernmodusLayout />}>
                      <Route index element={<LernmodusOverviewPage />} />
                      <Route path="aufgaben/:taskId" element={<LernmodusTaskPage />} />
                    </Route>
                    <Route path="einstellungen" element={<EinstellungenPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
              </AccountingProvider>
            </AuthGate>
          </DataBackendProvider>
        </OrgProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
