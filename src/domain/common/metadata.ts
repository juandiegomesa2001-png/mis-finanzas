import type { DomainDateTime } from './primitives'
import type { Revision } from './revision'

export interface EntityMetadata {
  readonly createdAt: DomainDateTime
  readonly updatedAt: DomainDateTime
  readonly revision: Revision
}

