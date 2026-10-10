import { describe, expect, it } from 'vitest'

import type { PositiveMoneyAmount } from '../common/primitives'
import { toDomainDateTime, toPositiveMoneyAmount } from '../common/primitives'
import type { TransactionCandidate } from './transaction'
import { validateTransaction } from './validation'
import {
  CONFIRMED_AT,
  COP,
  createAccount,
  EFFECTIVE_DATE,
  IDS,
  METADATA,
  USD,
  VOIDED_AT,
} from '../tests/fixtures'

function candidate(
  overrides: Partial<TransactionCandidate> = {},
): TransactionCandidate {
  return {
    id: IDS.transfer,
    type: 'transfer',
    status: 'confirmed',
    amount: toPositiveMoneyAmount(10_000),
    currency: COP,
    effectiveDate: EFFECTIVE_DATE,
    sourceAccountId: IDS.accountA,
    destinationAccountId: IDS.accountB,
    confirmedAt: CONFIRMED_AT,
    ...METADATA,
    ...overrides,
  }
}

const accounts = [
  createAccount(),
  createAccount({ id: IDS.accountB, name: 'Cuenta B' }),
  createAccount({
    id: IDS.accountUsd,
    name: 'Cuenta USD',
    currency: USD,
  }),
]

function codes(transaction: TransactionCandidate): readonly string[] {
  return validateTransaction(transaction, accounts).map(({ code }) => code)
}

describe('validación de movimientos', () => {
  it('acepta una transferencia válida como un único movimiento', () => {
    expect(validateTransaction(candidate(), accounts)).toEqual([])
  })

  it('rechaza transferencias hacia la misma cuenta', () => {
    expect(
      codes(candidate({ destinationAccountId: IDS.accountA })),
    ).toContain('same_transfer_account')
  })

  it('rechaza transferencias entre monedas diferentes', () => {
    expect(
      codes(
        candidate({
          destinationAccountId: IDS.accountUsd,
        }),
      ),
    ).toContain('currency_mismatch')
  })

  it('rechaza una moneda distinta de la cuenta involucrada', () => {
    expect(codes(candidate({ currency: USD }))).toContain('currency_mismatch')
  })

  it.each([0, -100, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza el importe inválido %s aunque llegue desde una fuente no tipada',
    (amount) => {
      expect(
        codes(candidate({ amount: amount as PositiveMoneyAmount })),
      ).toContain('invalid_amount')
    },
  )

  it('exige cuenta de destino y categoría para un ingreso', () => {
    const transaction = candidate({
      type: 'income',
      sourceAccountId: undefined,
      destinationAccountId: undefined,
      confirmedAt: CONFIRMED_AT,
    } as unknown as Partial<TransactionCandidate>)

    expect(codes(transaction)).toEqual(
      expect.arrayContaining(['missing_account', 'missing_category']),
    )
  })

  it('exige cuenta de origen y categoría para un gasto', () => {
    const transaction = candidate({
      type: 'expense',
      sourceAccountId: undefined,
      destinationAccountId: undefined,
    } as unknown as Partial<TransactionCandidate>)

    expect(codes(transaction)).toEqual(
      expect.arrayContaining(['invalid_expense_source', 'missing_category']),
    )
  })

  it('rechaza categorías en transferencias', () => {
    expect(
      codes(candidate({ categoryId: IDS.categoryExpense })),
    ).toContain('unexpected_category')
  })

  it('exige una dirección en los ajustes', () => {
    const transaction = candidate({
      type: 'adjustment',
      sourceAccountId: undefined,
      destinationAccountId: undefined,
      accountId: IDS.accountA,
    } as unknown as Partial<TransactionCandidate>)

    expect(codes(transaction)).toContain('missing_adjustment_direction')
  })

  it('rechaza una confirmación en un movimiento pendiente', () => {
    expect(codes(candidate({ status: 'pending' }))).toContain(
      'unexpected_confirmation_date',
    )
  })

  it('exige fecha de confirmación en un movimiento confirmado', () => {
    const transaction = candidate({
      confirmedAt: undefined,
    } as unknown as Partial<TransactionCandidate>)

    expect(codes(transaction)).toContain('missing_confirmation_date')
  })

  it('exige fecha y motivo cuando el movimiento está anulado', () => {
    const transaction = candidate({
      status: 'voided',
      confirmedAt: undefined,
    } as unknown as Partial<TransactionCandidate>)

    expect(codes(transaction)).toContain('missing_void_data')
  })

  it('acepta una anulación trazable posterior a la confirmación', () => {
    expect(
      validateTransaction(
        candidate({
          status: 'voided',
          voidedAt: VOIDED_AT,
          voidReason: 'Registro duplicado',
        }),
        accounts,
      ),
    ).toEqual([])
  })

  it('rechaza una anulación anterior a la confirmación', () => {
    expect(
      codes(
        candidate({
          status: 'voided',
          voidedAt: toDomainDateTime('2026-01-15T12:00:30.000Z'),
          voidReason: 'Error',
        }),
      ),
    ).toContain('invalid_lifecycle_dates')
  })
})

