import { liveQuery } from 'dexie'
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  financeService,
  type FinanceSnapshot,
} from '../services/financeService'
import { obligationService } from '../services/obligationService'
import { FinanceDataContext, type FinanceDataState } from './FinanceDataContext'

const EMPTY_SNAPSHOT: FinanceSnapshot = {
  accounts: [],
  categories: [],
  transactions: [],
  incomeSchedules: [],
  creditCards: [],
  installmentPurchases: [],
  installmentSchedules: [],
  cardPayments: [],
  cardStatements: [],
  recurringObligations: [],
  savingsGoals: [],
  reminders: [],
}

export function FinanceDataProvider({ children }: { readonly children: ReactNode }) {
  const [state, setState] = useState<FinanceDataState>({
    data: EMPTY_SNAPSHOT,
    loading: true,
  })

  useEffect(() => {
    let active = true
    let subscription: { unsubscribe(): void } | undefined

    void financeService
      .initialize()
      .then(() => {
        if (!active) {
          return
        }

        subscription = liveQuery(() => financeService.getSnapshot()).subscribe({
          next: (data) => {
            if (active) {
              setState({ data, loading: false })
            }
          },
          error: (error: unknown) => {
            if (active) {
              setState({
                data: EMPTY_SNAPSHOT,
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'No fue posible leer los datos locales.',
              })
            }
          },
        })
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            data: EMPTY_SNAPSHOT,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'No fue posible iniciar la base de datos local.',
          })
        }
      })

    return () => {
      active = false
      subscription?.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') void obligationService.refreshReminders() }
    void obligationService.refreshReminders()
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = state.data.settings?.theme ?? 'dark'
  }, [state.data.settings?.theme])

  const value = useMemo(() => state, [state])

  return (
    <FinanceDataContext.Provider value={value}>
      {children}
    </FinanceDataContext.Provider>
  )
}

