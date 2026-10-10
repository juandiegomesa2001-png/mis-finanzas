import type { Account } from '../accounts/account'
import {
  checkedMoneySum,
  DomainValidationError,
  isMoneyAmount,
  isPositiveMoneyAmount,
  toMoneyAmount,
  type Currency,
  type DomainDate,
  type MoneyAmount,
  type UUID,
} from '../common/primitives'
import type { Transaction } from './transaction'

export interface DateRange {
  readonly from: DomainDate
  readonly to: DomainDate
}

function assertValidRange(range: DateRange): void {
  if (range.from > range.to) {
    throw new DomainValidationError(
      'La fecha inicial del rango no puede ser posterior a la fecha final.',
    )
  }
}

function assertValidTransactionAmount(transaction: Transaction): void {
  if (!isPositiveMoneyAmount(transaction.amount)) {
    throw new DomainValidationError(
      'El cálculo recibió un movimiento con importe no válido.',
    )
  }
}

function transactionEffectForAccount(
  transaction: Transaction,
  accountId: UUID,
): MoneyAmount {
  if (transaction.type === 'income') {
    return toMoneyAmount(
      transaction.destinationAccountId === accountId ? transaction.amount : 0,
    )
  }

  if (transaction.type === 'expense') {
    return toMoneyAmount(
      transaction.sourceAccountId === accountId ? -transaction.amount : 0,
    )
  }

  if (transaction.type === 'transfer') {
    if (transaction.sourceAccountId === transaction.destinationAccountId) {
      throw new DomainValidationError(
        'No se puede calcular una transferencia hacia la misma cuenta.',
      )
    }

    if (transaction.sourceAccountId === accountId) {
      return toMoneyAmount(-transaction.amount)
    }

    if (transaction.destinationAccountId === accountId) {
      return toMoneyAmount(transaction.amount)
    }

    return toMoneyAmount(0)
  }

  if (transaction.accountId !== accountId) {
    return toMoneyAmount(0)
  }

  return toMoneyAmount(
    transaction.adjustmentDirection === 'inflow'
      ? transaction.amount
      : -transaction.amount,
  )
}

function referencesAccount(
  transaction: Transaction,
  accountId: UUID,
): boolean {
  if (transaction.type === 'income') {
    return transaction.destinationAccountId === accountId
  }

  if (transaction.type === 'expense') {
    return transaction.sourceAccountId === accountId
  }

  if (transaction.type === 'transfer') {
    return (
      transaction.sourceAccountId === accountId ||
      transaction.destinationAccountId === accountId
    )
  }

  return transaction.accountId === accountId
}

export function calculateAccountBalance(
  account: Account,
  transactions: readonly Transaction[],
): MoneyAmount {
  if (!isMoneyAmount(account.initialBalance)) {
    throw new DomainValidationError('El saldo inicial no es un importe válido.')
  }

  let balance = account.initialBalance

  for (const transaction of transactions) {
    if (
      transaction.status !== 'confirmed' ||
      transaction.effectiveDate < account.initialDate ||
      !referencesAccount(transaction, account.id)
    ) {
      continue
    }

    assertValidTransactionAmount(transaction)

    if (transaction.currency !== account.currency) {
      throw new DomainValidationError(
        'La moneda del movimiento no coincide con la moneda de la cuenta.',
      )
    }

    balance = checkedMoneySum(
      balance,
      transactionEffectForAccount(transaction, account.id),
    )
  }

  return balance
}

function calculateConsumptionTotal(
  transactions: readonly Transaction[],
  range: DateRange,
  currency: Currency,
  type: 'income' | 'expense',
): MoneyAmount {
  assertValidRange(range)
  let total = toMoneyAmount(0)

  for (const transaction of transactions) {
    if (
      transaction.status !== 'confirmed' ||
      transaction.type !== type ||
      transaction.currency !== currency ||
      transaction.effectiveDate < range.from ||
      transaction.effectiveDate > range.to
    ) {
      continue
    }

    assertValidTransactionAmount(transaction)
    total = checkedMoneySum(total, toMoneyAmount(transaction.amount))
  }

  return total
}

export function calculateIncomeTotal(
  transactions: readonly Transaction[],
  range: DateRange,
  currency: Currency,
): MoneyAmount {
  return calculateConsumptionTotal(transactions, range, currency, 'income')
}

export function calculateExpenseTotal(
  transactions: readonly Transaction[],
  range: DateRange,
  currency: Currency,
): MoneyAmount {
  return calculateConsumptionTotal(transactions, range, currency, 'expense')
}

