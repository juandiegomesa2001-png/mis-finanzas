import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ErrorMessage } from '../components/Feedback'
import { AppShell } from './AppShell'
import { useFinanceData } from './FinanceDataContext'
import { FinanceDataProvider } from './FinanceDataProvider'

const AccountsPage = lazy(() =>
  import('../features/accounts/AccountsPage').then((module) => ({
    default: module.AccountsPage,
  })),
)
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)
const IncomePage = lazy(() =>
  import('../features/movements/IncomePage').then((module) => ({
    default: module.IncomePage,
  })),
)
const MovementsPage = lazy(() =>
  import('../features/movements/MovementsPage').then((module) => ({
    default: module.MovementsPage,
  })),
)
const QuickExpensePage = lazy(() =>
  import('../features/movements/QuickExpensePage').then((module) => ({
    default: module.QuickExpensePage,
  })),
)
const TransferPage = lazy(() =>
  import('../features/movements/TransferPage').then((module) => ({
    default: module.TransferPage,
  })),
)
const MorePage = lazy(() =>
  import('../features/more/MorePage').then((module) => ({
    default: module.MorePage,
  })),
)
const CardsPage = lazy(() => import('../features/cards/CardsPage').then((module) => ({ default: module.CardsPage })))
const PlanPage = lazy(() => import('../features/planning/PlanHubPage').then((module) => ({ default: module.PlanHubPage })))
const ObligationsPage = lazy(() => import('../features/obligations/ObligationsPage').then((module) => ({ default: module.ObligationsPage })))
const OnboardingPage = lazy(() =>
  import('../features/onboarding/OnboardingPage').then((module) => ({
    default: module.OnboardingPage,
  })),
)

function LoadingPage() {
  return <div className="boot-screen" role="status">Cargando…</div>
}

function ApplicationRoutes() {
  const { data, loading, error } = useFinanceData()

  if (loading) {
    return (
      <div className="boot-screen" role="status">
        <span className="brand-mark">MF</span>
        <p>Abriendo tus finanzas…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="boot-screen">
        <ErrorMessage message={error} />
        <p>Tus datos locales no fueron eliminados.</p>
      </div>
    )
  }

  if (!data.settings) {
    return (
      <Suspense fallback={<LoadingPage />}>
        <OnboardingPage />
      </Suspense>
    )
  }

  return (
    <Suspense fallback={<LoadingPage />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="movements" element={<MovementsPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="expense" element={<QuickExpensePage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="transfer" element={<TransferPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="onboarding" element={<OnboardingPage />} />
          <Route path="more" element={<MorePage />} />
          <Route path="obligations" element={<ObligationsPage />} />
        </Route>
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  )
}

export function AppRouter() {
  return (
    <HashRouter>
      <FinanceDataProvider>
        <ApplicationRoutes />
      </FinanceDataProvider>
    </HashRouter>
  )
}

