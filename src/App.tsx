import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import { BerichtePage } from './pages/BerichtePage'
import { BuchhaltungPage } from './pages/BuchhaltungPage'
import { DashboardPage } from './pages/DashboardPage'
import { EinkaufPage } from './pages/EinkaufPage'
import { EinstellungenPage } from './pages/EinstellungenPage'
import { KontaktePage } from './pages/KontaktePage'
import { LagerPage } from './pages/LagerPage'
import { VerkaufPage } from './pages/VerkaufPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="buchhaltung" element={<BuchhaltungPage />} />
          <Route path="verkauf" element={<VerkaufPage />} />
          <Route path="einkauf" element={<EinkaufPage />} />
          <Route path="lager" element={<LagerPage />} />
          <Route path="kontakte" element={<KontaktePage />} />
          <Route path="berichte" element={<BerichtePage />} />
          <Route path="einstellungen" element={<EinstellungenPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
