import type { Account } from '../accounts/account'
import {
  DomainValidationError,
  isPositiveMoneyAmount,
  type UUID,
} from '../common/primitives'
import type { Transaction, TransactionCandidate } from './transaction'

export type TransactionValidationCode =
  | 'invalid_amount'
  | 'missing_account'
  | 'unexpected_account'
  | 'same_transfer_account'
  | 'missing_category'
  | 'unexpected_category'
  | 'missing_adjustment_direction'
  | 'unexpected_adjustment_direction'
  | 'account_not_found'
  | 'currency_mismatch'
  | 'missing_confirmation_date'
  | 'unexpected_confirmation_date'
  | 'missing_void_data'
  | 'unexpected_void_data'
  | 'invalid_metadata_dates'
  | 'invalid_lifecycle_dates'
  | 'invalid_expense_source'

export interface TransactionValidationIssue {
  readonly code: TransactionValidationCode
  readonly field: string
  readonly message: string
}

function issue(
  code: TransactionValidationCode,
  field: string,
  message: string,
): TransactionValidationIssue {
  return { code, field, message }
}

function findAccount(
  accounts: readonly Account[],
  accountId: UUID | undefined,
): Account | undefined {
  return accounts.find((account) => account.id === accountId)
}

function validateReferencedAccount(
  transaction: TransactionCandidate,
  accounts: readonly Account[],
  accountId: UUID | undefined,
  field: string,
  issues: TransactionValidationIssue[],
): Account | undefined {
  if (!accountId) {
    issues.push(issue('missing_account', field, 'La cuenta es obligatoria.'))
    return undefined
  }

  const account = findAccount(accounts, accountId)

  if (!account) {
    issues.push(
      issue('account_not_found', field, 'La cuenta referenciada no existe.'),
    )
    return undefined
  }

  if (account.currency !== transaction.currency) {
    issues.push(
      issue(
        'currency_mismatch',
        'currency',
        'La moneda del movimiento no coincide con la moneda de la cuenta.',
      ),
    )
  }

  return account
}

function validateLifecycle(
  transaction: TransactionCandidate,
  issues: TransactionValidationIssue[],
): void {
  if (transaction.updatedAt < transaction.createdAt) {
    issues.push(
      issue(
        'invalid_metadata_dates',
        'updatedAt',
        'updatedAt no puede ser anterior a createdAt.',
      ),
    )
  }

  if (transaction.status === 'pending') {
    if (transaction.confirmedAt) {
      issues.push(
        issue(
          'unexpected_confirmation_date',
          'confirmedAt',
          'Un movimiento pendiente no puede tener fecha de confirmación.',
        ),
      )
    }

    if (transaction.voidedAt || transaction.voidReason) {
      issues.push(
        issue(
          'unexpected_void_data',
          'voidedAt',
          'Un movimiento pendiente no puede contener datos de anulación.',
        ),
      )
    }
  }

  if (transaction.status === 'confirmed') {
    if (!transaction.confirmedAt) {
      issues.push(
        issue(
          'missing_confirmation_date',
          'confirmedAt',
          'Un movimiento confirmado requiere fecha de confirmación.',
        ),
      )
    }

    if (transaction.voidedAt || transaction.voidReason) {
      issues.push(
        issue(
          'unexpected_void_data',
          'voidedAt',
          'Un movimiento confirmado no puede contener datos de anulación.',
        ),
      )
    }
  }

  if (transaction.status === 'voided') {
    if (!transaction.voidedAt || !transaction.voidReason?.trim()) {
      issues.push(
        issue(
          'missing_void_data',
          'voidedAt',
          'Un movimiento anulado requiere fecha y motivo de anulación.',
        ),
      )
    }

    if (
      transaction.voidedAt &&
      transaction.confirmedAt &&
      transaction.voidedAt < transaction.confirmedAt
    ) {
      issues.push(
        issue(
          'invalid_lifecycle_dates',
          'voidedAt',
          'La anulación no puede ser anterior a la confirmación.',
        ),
      )
    }
  }

  if (
    transaction.confirmedAt &&
    transaction.confirmedAt < transaction.createdAt
  ) {
    issues.push(
      issue(
        'invalid_lifecycle_dates',
        'confirmedAt',
        'La confirmación no puede ser anterior a la creación.',
      ),
    )
  }

  if (transaction.voidedAt && transaction.voidedAt < transaction.createdAt) {
    issues.push(
      issue(
        'invalid_lifecycle_dates',
        'voidedAt',
        'La anulación no puede ser anterior a la creación.',
      ),
    )
  }
}

export function validateTransaction(
  transaction: TransactionCandidate,
  accounts: readonly Account[],
): readonly TransactionValidationIssue[] {
  const issues: TransactionValidationIssue[] = []

  if (!isPositiveMoneyAmount(transaction.amount)) {
    issues.push(
      issue(
        'invalid_amount',
        'amount',
        'El importe debe ser un entero seguro mayor que cero.',
      ),
    )
  }

  validateLifecycle(transaction, issues)

  if (transaction.type === 'income') {
    validateReferencedAccount(
      transaction,
      accounts,
      transaction.destinationAccountId,
      'destinationAccountId',
      issues,
    )

    if (!transaction.categoryId) {
      issues.push(
        issue(
          'missing_category',
          'categoryId',
          'Un ingreso requiere categoría.',
        ),
      )
    }

    if (transaction.sourceAccountId || transaction.accountId || transaction.creditCardId) {
      issues.push(
        issue(
          'unexpected_account',
          'sourceAccountId',
          'Un ingreso solo puede tener una cuenta de destino.',
        ),
      )
    }
  }

  if (transaction.type === 'expense') {
    const hasAccount = Boolean(transaction.sourceAccountId)
    const hasCard = Boolean(transaction.creditCardId)
    if (hasAccount === hasCard) {
      issues.push(issue('invalid_expense_source', 'sourceAccountId', 'Un gasto requiere exactamente una cuenta o una tarjeta.'))
    } else if (hasAccount) {
      validateReferencedAccount(transaction, accounts, transaction.sourceAccountId, 'sourceAccountId', issues)
    }

    if (!transaction.categoryId) {
      issues.push(
        issue(
          'missing_category',
          'categoryId',
          'Un gasto requiere categoría.',
        ),
      )
    }

    if (transaction.destinationAccountId || transaction.accountId) {
      issues.push(
        issue(
          'unexpected_account',
          'destinationAccountId',
          'Un gasto solo puede tener una cuenta de origen.',
        ),
      )
    }
  }

  if (transaction.type === 'transfer') {
    const source = validateReferencedAccount(
      transaction,
      accounts,
      transaction.sourceAccountId,
      'sourceAccountId',
      issues,
    )
    const destination = validateReferencedAccount(
      transaction,
      accounts,
      transaction.destinationAccountId,
      'destinationAccountId',
      issues,
    )

    if (
      transaction.sourceAccountId &&
      transaction.sourceAccountId === transaction.destinationAccountId
    ) {
      issues.push(
        issue(
          'same_transfer_account',
          'destinationAccountId',
          'La cuenta de destino debe ser diferente de la cuenta de origen.',
        ),
      )
    }

    if (source && destination && source.currency !== destination.currency) {
      issues.push(
        issue(
          'currency_mismatch',
          'destinationAccountId',
          'Las transferencias de Fase 1 requieren cuentas con la misma moneda.',
        ),
      )
    }

    if (transaction.categoryId) {
      issues.push(
        issue(
          'unexpected_category',
          'categoryId',
          'Una transferencia no se clasifica como ingreso ni gasto.',
        ),
      )
    }

    if (transaction.accountId || transaction.creditCardId) {
      issues.push(
        issue(
          'unexpected_account',
          'accountId',
          'Una transferencia utiliza cuentas de origen y destino.',
        ),
      )
    }
  }

  if (transaction.type === 'adjustment') {
    validateReferencedAccount(
      transaction,
      accounts,
      transaction.accountId,
      'accountId',
      issues,
    )

    if (!transaction.adjustmentDirection) {
      issues.push(
        issue(
          'missing_adjustment_direction',
          'adjustmentDirection',
          'Un ajuste requiere dirección de entrada o salida.',
        ),
      )
    }

    if (transaction.sourceAccountId || transaction.destinationAccountId || transaction.creditCardId) {
      issues.push(
        issue(
          'unexpected_account',
          'accountId',
          'Un ajuste utiliza una única cuenta.',
        ),
      )
    }

    if (transaction.categoryId) {
      issues.push(
        issue(
          'unexpected_category',
          'categoryId',
          'Un ajuste no se contabiliza como ingreso ni gasto de consumo.',
        ),
      )
    }
  } else if (transaction.adjustmentDirection) {
    issues.push(
      issue(
        'unexpected_adjustment_direction',
        'adjustmentDirection',
        'Solo un ajuste puede tener dirección de ajuste.',
      ),
    )
  }

  return issues
}

export function assertValidTransaction(
  transaction: TransactionCandidate,
  accounts: readonly Account[],
): asserts transaction is Transaction {
  const issues = validateTransaction(transaction, accounts)

  if (issues.length > 0) {
    throw new DomainValidationError(issues.map(({ message }) => message).join(' '))
  }
}

