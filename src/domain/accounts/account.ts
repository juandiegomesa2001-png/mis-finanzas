import type { EntityMetadata } from '../common/metadata'
import type {
  Currency,
  DomainDate,
  MoneyAmount,
  UUID,
} from '../common/primitives'

export type AccountType =
  | 'savings'
  | 'checking'
  | 'cash'
  | 'digital_wallet'
  | 'savings_reserve'
  | 'other'

export type AccountStatus = 'active' | 'archived'

export interface Account extends EntityMetadata {
  readonly id: UUID
  readonly name: string
  readonly institution?: string
  readonly type: AccountType
  readonly currency: Currency
  readonly initialBalance: MoneyAmount
  readonly initialDate: DomainDate
  readonly status: AccountStatus
  readonly icon?: string
  readonly color?: string
}

