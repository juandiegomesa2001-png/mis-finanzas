import type { Account } from '../accounts/account'
import type { EntityMetadata } from '../common/metadata'
import {
  toCurrency,
  toDomainDate,
  toDomainDateTime,
  toMoneyAmount,
  toPositiveMoneyAmount,
  toUuid,
} from '../common/primitives'
import { INITIAL_REVISION } from '../common/revision'
import type { Transaction } from '../transactions/transaction'

export const IDS = {
  accountA: toUuid('10000000-0000-4000-8000-000000000001'),
  accountB: toUuid('10000000-0000-4000-8000-000000000002'),
  accountUsd: toUuid('10000000-0000-4000-8000-000000000003'),
  categoryIncome: toUuid('20000000-0000-4000-8000-000000000001'),
  categoryExpense: toUuid('20000000-0000-4000-8000-000000000002'),
  income: toUuid('30000000-0000-4000-8000-000000000001'),
  expense: toUuid('30000000-0000-4000-8000-000000000002'),
  transfer: toUuid('30000000-0000-4000-8000-000000000003'),
  adjustment: toUuid('30000000-0000-4000-8000-000000000004'),
} as const

export const COP = toCurrency('COP')
export const USD = toCurrency('USD')
export const INITIAL_DATE = toDomainDate('2026-01-01')
export const EFFECTIVE_DATE = toDomainDate('2026-01-15')
export const CREATED_AT = toDomainDateTime('2026-01-15T12:00:00.000Z')
export const CONFIRMED_AT = toDomainDateTime('2026-01-15T12:01:00.000Z')
export const VOIDED_AT = toDomainDateTime('2026-01-15T12:02:00.000Z')

export const METADATA: EntityMetadata = {
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  revision: INITIAL_REVISION,
}

export function createAccount(
  overrides: Partial<Account> = {},
): Account {
  return {
    id: IDS.accountA,
    name: 'Cuenta de prueba',
    type: 'savings',
    currency: COP,
    initialBalance: toMoneyAmount(100_000),
    initialDate: INITIAL_DATE,
    status: 'active',
    ...METADATA,
    ...overrides,
  }
}

export function confirmedIncome(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: IDS.income,
    type: 'income',
    status: 'confirmed',
    amount: toPositiveMoneyAmount(50_000),
    currency: COP,
    effectiveDate: EFFECTIVE_DATE,
    destinationAccountId: IDS.accountA,
    categoryId: IDS.categoryIncome,
    confirmedAt: CONFIRMED_AT,
    ...METADATA,
    ...overrides,
  } as Transaction
}

export function confirmedExpense(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: IDS.expense,
    type: 'expense',
    status: 'confirmed',
    amount: toPositiveMoneyAmount(20_000),
    currency: COP,
    effectiveDate: EFFECTIVE_DATE,
    sourceAccountId: IDS.accountA,
    categoryId: IDS.categoryExpense,
    confirmedAt: CONFIRMED_AT,
    ...METADATA,
    ...overrides,
  } as Transaction
}

export function confirmedTransfer(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: IDS.transfer,
    type: 'transfer',
    status: 'confirmed',
    amount: toPositiveMoneyAmount(30_000),
    currency: COP,
    effectiveDate: EFFECTIVE_DATE,
    sourceAccountId: IDS.accountA,
    destinationAccountId: IDS.accountB,
    confirmedAt: CONFIRMED_AT,
    ...METADATA,
    ...overrides,
  } as Transaction
}

export function confirmedAdjustment(
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    id: IDS.adjustment,
    type: 'adjustment',
    status: 'confirmed',
    amount: toPositiveMoneyAmount(5_000),
    currency: COP,
    effectiveDate: EFFECTIVE_DATE,
    accountId: IDS.accountA,
    adjustmentDirection: 'inflow',
    confirmedAt: CONFIRMED_AT,
    ...METADATA,
    ...overrides,
  } as Transaction
}

