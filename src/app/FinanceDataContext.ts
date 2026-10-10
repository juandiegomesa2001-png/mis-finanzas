import { createContext, useContext } from 'react'

import type { FinanceSnapshot } from '../services/financeService'

export interface FinanceDataState {
  readonly data: FinanceSnapshot
  readonly loading: boolean
  readonly error?: string
}

export const FinanceDataContext = createContext<FinanceDataState | undefined>(
  undefined,
)

export function useFinanceData(): FinanceDataState {
  const context = useContext(FinanceDataContext)

  if (!context) {
    throw new Error('useFinanceData debe utilizarse dentro de FinanceDataProvider.')
  }

  return context
}

