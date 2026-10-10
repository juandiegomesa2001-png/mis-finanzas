import type { EntityMetadata } from '../common/metadata'
import type { UUID } from '../common/primitives'

export type CategoryKind = 'income' | 'expense'
export type CategoryStatus = 'active' | 'archived'

export interface Category extends EntityMetadata {
  readonly id: UUID
  readonly name: string
  readonly kind: CategoryKind
  readonly status: CategoryStatus
  readonly systemKey?: string
}

