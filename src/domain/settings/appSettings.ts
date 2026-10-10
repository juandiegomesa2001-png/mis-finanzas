import type { EntityMetadata } from '../common/metadata'
import type { Currency, UUID } from '../common/primitives'

export interface AppSettings extends EntityMetadata {
  readonly id: UUID
  readonly key: 'primary'
  readonly currency: Currency
  readonly onboardingCompleted: boolean
  readonly onboardingSkipped: boolean
  readonly lastExpenseAccountId?: UUID
  readonly theme?: 'dark' | 'light'
}

