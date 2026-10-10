import { DomainValidationError } from './primitives'

declare const revisionBrand: unique symbol

export type Revision = number & { readonly [revisionBrand]: 'Revision' }

export function toRevision(value: number): Revision {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new DomainValidationError(
      'La revisión debe ser un entero seguro positivo.',
    )
  }

  return value as Revision
}

export const INITIAL_REVISION: Revision = toRevision(1)

export function incrementRevision(current: Revision): Revision {
  return toRevision(current + 1)
}

