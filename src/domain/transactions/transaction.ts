import type { EntityMetadata } from '../common/metadata'
import type {
  Currency,
  DomainDate,
  DomainDateTime,
  PositiveMoneyAmount,
  UUID,
} from '../common/primitives'

export type TransactionType =
  | 'income'
  | 'expense'
  | 'transfer'
  | 'adjustment'

export type TransactionStatus = 'pending' | 'confirmed' | 'voided'
export type AdjustmentDirection = 'inflow' | 'outflow'

interface TransactionBase extends EntityMetadata {
  readonly id: UUID
  readonly amount: PositiveMoneyAmount
  readonly currency: Currency
  readonly effectiveDate: DomainDate
  readonly description?: string
  /** Enlace opcional de trazabilidad; nunca contiene datos sensibles. */
  readonly relatedEntityId?: UUID
}

interface IncomeFields {
  readonly type: 'income'
  readonly destinationAccountId: UUID
  readonly categoryId: UUID
  readonly sourceAccountId?: never
  readonly accountId?: never
  readonly adjustmentDirection?: never
}

interface ExpenseFields {
  readonly type: 'expense'
  /** Los gastos con tarjeta no reducen una cuenta de efectivo al comprarse. */
  readonly sourceAccountId?: UUID
  readonly creditCardId?: UUID
  readonly categoryId: UUID
  readonly destinationAccountId?: never
  readonly accountId?: never
  readonly adjustmentDirection?: never
}

interface TransferFields {
  readonly type: 'transfer'
  readonly sourceAccountId: UUID
  readonly destinationAccountId: UUID
  readonly categoryId?: never
  readonly accountId?: never
  readonly adjustmentDirection?: never
}

interface AdjustmentFields {
  readonly type: 'adjustment'
  readonly accountId: UUID
  readonly adjustmentDirection: AdjustmentDirection
  readonly categoryId?: never
  readonly sourceAccountId?: never
  readonly destinationAccountId?: never
}

interface PendingLifecycle {
  readonly status: 'pending'
  readonly confirmedAt?: never
  readonly voidedAt?: never
  readonly voidReason?: never
}

interface ConfirmedLifecycle {
  readonly status: 'confirmed'
  readonly confirmedAt: DomainDateTime
  readonly voidedAt?: never
  readonly voidReason?: never
}

interface VoidedLifecycle {
  readonly status: 'voided'
  readonly confirmedAt?: DomainDateTime
  readonly voidedAt: DomainDateTime
  readonly voidReason: string
}

export type Transaction = Readonly<
  TransactionBase &
    (IncomeFields | ExpenseFields | TransferFields | AdjustmentFields) &
    (PendingLifecycle | ConfirmedLifecycle | VoidedLifecycle)
>

export interface TransactionCandidate extends EntityMetadata {
  readonly id: UUID
  readonly type: TransactionType
  readonly status: TransactionStatus
  readonly amount: PositiveMoneyAmount
  readonly currency: Currency
  readonly effectiveDate: DomainDate
  readonly description?: string
  readonly categoryId?: UUID
  readonly sourceAccountId?: UUID
  readonly destinationAccountId?: UUID
  readonly accountId?: UUID
  readonly adjustmentDirection?: AdjustmentDirection
  readonly creditCardId?: UUID
  readonly relatedEntityId?: UUID
  readonly confirmedAt?: DomainDateTime
  readonly voidedAt?: DomainDateTime
  readonly voidReason?: string
}

