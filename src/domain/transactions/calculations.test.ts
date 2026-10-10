import { describe, expect, it } from 'vitest'

import { incrementRevision } from '../common/revision'
import {
  DomainValidationError,
  toDomainDate,
  toMoneyAmount,
  toPositiveMoneyAmount,
} from '../common/primitives'
import type { Transaction } from './transaction'
import {
  calculateAccountBalance,
  calculateExpenseTotal,
  calculateIncomeTotal,
} from './calculations'
import {
  CONFIRMED_AT,
  COP,
  createAccount,
  confirmedAdjustment,
  confirmedExpense,
  confirmedIncome,
  confirmedTransfer,
  IDS,
  METADATA,
  USD,
  VOIDED_AT,
} from '../tests/fixtures'

const JANUARY = {
  from: toDomainDate('2026-01-01'),
  to: toDomainDate('2026-01-31'),
}

describe('cálculo de saldo', () => {
  it('devuelve el saldo inicial cuando no hay movimientos', () => {
    expect(calculateAccountBalance(createAccount(), [])).toBe(100_000)
  })

  it('suma un ingreso confirmado', () => {
    expect(calculateAccountBalance(createAccount(), [confirmedIncome()])).toBe(
      150_000,
    )
  })

  it('resta un gasto confirmado', () => {
    expect(calculateAccountBalance(createAccount(), [confirmedExpense()])).toBe(
      80_000,
    )
  })

  it('ignora movimientos pendientes', () => {
    const pending = {
      ...confirmedIncome(),
      status: 'pending',
      confirmedAt: undefined,
    } as unknown as Transaction

    expect(calculateAccountBalance(createAccount(), [pending])).toBe(100_000)
  })

  it('ignora movimientos anulados', () => {
    const voided = {
      ...confirmedExpense(),
      status: 'voided',
      voidedAt: VOIDED_AT,
      voidReason: 'Registro incorrecto',
    } as Transaction

    expect(calculateAccountBalance(createAccount(), [voided])).toBe(100_000)
  })

  it('resta la transferencia de la cuenta de origen', () => {
    expect(
      calculateAccountBalance(createAccount(), [confirmedTransfer()]),
    ).toBe(70_000)
  })

  it('suma la transferencia en la cuenta de destino', () => {
    const destination = createAccount({
      id: IDS.accountB,
      initialBalance: toMoneyAmount(10_000),
    })

    expect(calculateAccountBalance(destination, [confirmedTransfer()])).toBe(
      40_000,
    )
  })

  it('ignora movimientos anteriores a la fecha inicial de la cuenta', () => {
    const oldIncome = confirmedIncome({
      effectiveDate: toDomainDate('2025-12-31'),
    })

    expect(calculateAccountBalance(createAccount(), [oldIncome])).toBe(100_000)
  })

  it('incluye movimientos ocurridos exactamente en la fecha inicial', () => {
    const openingIncome = confirmedIncome({
      effectiveDate: toDomainDate('2026-01-01'),
    })

    expect(calculateAccountBalance(createAccount(), [openingIncome])).toBe(
      150_000,
    )
  })

  it('aplica ajustes confirmados sin clasificarlos como consumo', () => {
    const outflow = confirmedAdjustment({ adjustmentDirection: 'outflow' })

    expect(
      calculateAccountBalance(createAccount(), [confirmedAdjustment(), outflow]),
    ).toBe(100_000)
  })

  it('no modifica la colección ni los movimientos recibidos', () => {
    const transaction = Object.freeze(confirmedIncome())
    const transactions = Object.freeze([transaction])
    const snapshot = JSON.stringify(transactions)

    calculateAccountBalance(createAccount(), transactions)

    expect(JSON.stringify(transactions)).toBe(snapshot)
  })

  it('rechaza movimientos aplicables con otra moneda', () => {
    expect(() =>
      calculateAccountBalance(createAccount(), [
        confirmedIncome({ currency: USD }),
      ]),
    ).toThrow(DomainValidationError)
  })

  it('rechaza una transferencia hacia la misma cuenta al calcular', () => {
    expect(() =>
      calculateAccountBalance(createAccount(), [
        confirmedTransfer({ destinationAccountId: IDS.accountA }),
      ]),
    ).toThrow(DomainValidationError)
  })

  it('detecta desbordamiento del saldo calculado', () => {
    const account = createAccount({
      initialBalance: toMoneyAmount(Number.MAX_SAFE_INTEGER),
    })

    expect(() =>
      calculateAccountBalance(account, [
        confirmedIncome({ amount: toPositiveMoneyAmount(1) }),
      ]),
    ).toThrow(DomainValidationError)
  })
})

describe('totales de ingresos y gastos', () => {
  it('totaliza solo ingresos confirmados dentro del rango y moneda', () => {
    const outside = confirmedIncome({
      id: IDS.adjustment,
      effectiveDate: toDomainDate('2026-02-01'),
    })
    const otherCurrency = confirmedIncome({
      id: IDS.transfer,
      currency: USD,
    })

    expect(
      calculateIncomeTotal(
        [confirmedIncome(), outside, otherCurrency],
        JANUARY,
        COP,
      ),
    ).toBe(50_000)
  })

  it('totaliza solo gastos confirmados dentro del rango y moneda', () => {
    expect(
      calculateExpenseTotal([confirmedExpense()], JANUARY, COP),
    ).toBe(20_000)
  })

  it('excluye transferencias y ajustes de ingresos y gastos', () => {
    const transactions = [confirmedTransfer(), confirmedAdjustment()]

    expect(calculateIncomeTotal(transactions, JANUARY, COP)).toBe(0)
    expect(calculateExpenseTotal(transactions, JANUARY, COP)).toBe(0)
  })

  it('excluye movimientos pendientes y anulados', () => {
    const pendingIncome = {
      ...confirmedIncome(),
      status: 'pending',
      confirmedAt: undefined,
    } as unknown as Transaction
    const voidedExpense = {
      ...confirmedExpense(),
      status: 'voided',
      voidedAt: VOIDED_AT,
      voidReason: 'Error',
    } as Transaction

    expect(calculateIncomeTotal([pendingIncome], JANUARY, COP)).toBe(0)
    expect(calculateExpenseTotal([voidedExpense], JANUARY, COP)).toBe(0)
  })

  it('incluye ambos límites del rango', () => {
    const firstDay = confirmedIncome({
      effectiveDate: JANUARY.from,
    })
    const lastDay = confirmedIncome({
      id: IDS.adjustment,
      effectiveDate: JANUARY.to,
    })

    expect(calculateIncomeTotal([firstDay, lastDay], JANUARY, COP)).toBe(
      100_000,
    )
  })

  it('rechaza rangos invertidos', () => {
    expect(() =>
      calculateIncomeTotal(
        [confirmedIncome()],
        { from: JANUARY.to, to: JANUARY.from },
        COP,
      ),
    ).toThrow(DomainValidationError)
  })
})

describe('trazabilidad de revisión', () => {
  it('permite representar una actualización con revisión incrementada', () => {
    const original = confirmedIncome()
    const updated: Transaction = {
      ...original,
      description: 'Ingreso corregido',
      updatedAt: CONFIRMED_AT,
      revision: incrementRevision(original.revision),
    }

    expect(original.revision).toBe(1)
    expect(updated.revision).toBe(2)
  })

  it('los fixtures mantienen metadatos consistentes', () => {
    expect(METADATA.updatedAt).toBe(METADATA.createdAt)
  })
})
