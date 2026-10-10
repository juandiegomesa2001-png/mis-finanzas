import type { EntityMetadata } from '../common/metadata'
import type { Currency, DomainDate, MoneyAmount, PositiveMoneyAmount, UUID } from '../common/primitives'

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'other'
export type RecordStatus = 'active' | 'archived'

export interface CreditCard extends EntityMetadata {
  readonly id: UUID
  readonly bank: string
  readonly name: string
  readonly brand: CardBrand
  readonly lastFour?: string
  readonly currency: Currency
  readonly creditLimit: PositiveMoneyAmount
  readonly openingDebt: MoneyAmount
  readonly statementBalance: MoneyAmount
  readonly unbilledBalance: MoneyAmount
  /** Tasa efectiva anual en puntos básicos. 2.500 = 25,00 %. */
  readonly annualEffectiveRateBps?: number
  readonly closingDay: number
  readonly dueDay: number
  readonly minimumPayment: MoneyAmount
  readonly totalPayment: MoneyAmount
  readonly usualPaymentAccountId?: UUID
  readonly status: RecordStatus
}

export interface InstallmentPurchase extends EntityMetadata {
  readonly id: UUID
  readonly cardId: UUID
  readonly transactionId: UUID
  readonly description: string
  readonly purchaseDate: DomainDate
  readonly amount: PositiveMoneyAmount
  readonly currency: Currency
  readonly installmentCount: number
  readonly annualEffectiveRateBps?: number
  readonly financeCharges: MoneyAmount
  readonly paidInstallments: number
  readonly status: 'active' | 'paid' | 'voided'
}

export interface InstallmentSchedule extends EntityMetadata {
  readonly id: UUID
  readonly purchaseId: UUID
  readonly installmentNumber: number
  readonly dueDate: DomainDate
  readonly principal: MoneyAmount
  readonly interest: MoneyAmount
  readonly status: 'pending' | 'paid'
}

export type CardEntryType =
  | 'minimum_payment'
  | 'total_payment'
  | 'extra_payment'
  | 'refund'
  | 'adjustment_increase'
  | 'adjustment_decrease'
  | 'interest'
  | 'fee'

export interface CardPayment extends EntityMetadata {
  readonly id: UUID
  readonly cardId: UUID
  readonly type: CardEntryType
  readonly amount: PositiveMoneyAmount
  readonly currency: Currency
  readonly effectiveDate: DomainDate
  readonly paymentAccountId?: UUID
  readonly transactionId?: UUID
  readonly description?: string
  readonly status: 'confirmed' | 'voided'
}

export interface CardStatement extends EntityMetadata {
  readonly id: UUID
  readonly cardId: UUID
  readonly periodEnd: DomainDate
  readonly dueDate: DomainDate
  readonly statementBalance: MoneyAmount
  readonly unbilledBalance: MoneyAmount
  readonly minimumPayment: MoneyAmount
  readonly totalPayment: MoneyAmount
  readonly status: 'open' | 'paid' | 'reconciled'
}

export type ObligationKind = 'fixed_expense' | 'utility' | 'subscription'
export type ObligationFrequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'variable'

export interface RecurringObligation extends EntityMetadata {
  readonly id: UUID
  readonly name: string
  readonly kind: ObligationKind
  readonly categoryId: UUID
  readonly currency: Currency
  readonly expectedAmount: PositiveMoneyAmount
  readonly billedAmount?: PositiveMoneyAmount
  readonly frequency: ObligationFrequency
  readonly nextDueDate: DomainDate
  readonly paymentAccountId?: UUID
  readonly status: 'planned' | 'billed' | 'paid' | 'paused' | 'cancelled'
  readonly lastPaymentTransactionId?: UUID
}

export interface SavingsGoal extends EntityMetadata {
  readonly id: UUID
  readonly name: string
  readonly currency: Currency
  readonly targetAmount: PositiveMoneyAmount
  readonly currentAmount: MoneyAmount
  readonly targetDate?: DomainDate
  readonly priority: 'low' | 'medium' | 'high'
  readonly plannedMonthlyContribution: MoneyAmount
  readonly mode: 'flexible' | 'balanced' | 'accelerated'
  readonly status: 'active' | 'completed' | 'paused'
}

export interface Reminder extends EntityMetadata {
  readonly id: UUID
  readonly sourceKey: string
  readonly kind: 'card_closing' | 'card_due' | 'obligation_due' | 'goal_delayed'
  readonly title: string
  readonly dueDate: DomainDate
  readonly severity: 'info' | 'warning' | 'urgent'
  readonly dismissed: boolean
}

