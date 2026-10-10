import type { EntityMetadata } from '../common/metadata'
import type {
  Currency,
  DomainDate,
  PositiveMoneyAmount,
  UUID,
} from '../common/primitives'

export type IncomeFrequency = 'weekly' | 'biweekly' | 'monthly' | 'variable'
export type IncomeScheduleStatus = 'active' | 'paused'

export interface IncomeSchedule extends EntityMetadata {
  readonly id: UUID
  readonly key?: 'primary-income'
  readonly name: string
  readonly amount: PositiveMoneyAmount
  readonly currency: Currency
  readonly frequency: IncomeFrequency
  readonly nextEstimatedDate: DomainDate
  readonly destinationAccountId?: UUID
  readonly status: IncomeScheduleStatus
}

