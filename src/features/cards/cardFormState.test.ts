import { describe, expect, it } from 'vitest'

import {
  createEmptyCardForm,
  createEmptyPaymentForm,
  createEmptyPurchaseForm,
  resetCardForm,
} from './cardFormState'

describe('reinicio de formularios de tarjetas', () => {
  it('devuelve formularios limpios después de guardar cada alta', () => {
    expect(resetCardForm('card')).toEqual(createEmptyCardForm())
    expect(resetCardForm('purchase')).toEqual(createEmptyPurchaseForm())
    expect(resetCardForm('payment')).toEqual(createEmptyPaymentForm())
    expect(createEmptyCardForm().name).toBe('')
    expect(createEmptyPurchaseForm().amount).toBe('')
    expect(createEmptyPaymentForm().cardId).toBe('')
  })
})
