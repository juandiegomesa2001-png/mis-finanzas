import type { CardEntryType } from '../../domain'
import { todayDomainDate } from '../../utils/dates'

export type CardFormMode = 'card' | 'purchase' | 'payment'

export function createEmptyCardForm() {
  return {
    bank: '',
    name: '',
    brand: 'visa',
    lastFour: '',
    limit: '',
    debt: '0',
    rate: '',
    closingDay: '15',
    dueDay: '5',
    minimum: '0',
    total: '0',
    accountId: '',
  }
}

export function createEmptyPurchaseForm() {
  return {
    cardId: '',
    categoryId: '',
    description: '',
    date: todayDomainDate() as string,
    amount: '',
    installments: '1',
    rate: '',
  }
}

export function createEmptyPaymentForm() {
  return {
    cardId: '',
    type: 'extra_payment' as CardEntryType,
    amount: '',
    date: todayDomainDate() as string,
    accountId: '',
    categoryId: '',
    description: '',
  }
}

export function resetCardForm(mode: 'card'): ReturnType<typeof createEmptyCardForm>
export function resetCardForm(mode: 'purchase'): ReturnType<typeof createEmptyPurchaseForm>
export function resetCardForm(mode: 'payment'): ReturnType<typeof createEmptyPaymentForm>
export function resetCardForm(mode: CardFormMode) {
  if (mode === 'card') return createEmptyCardForm()
  if (mode === 'purchase') return createEmptyPurchaseForm()
  return createEmptyPaymentForm()
}
