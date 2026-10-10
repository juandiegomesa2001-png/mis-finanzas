import { toUuid, type UUID } from '../domain'

export function createUuid(): UUID {
  return toUuid(crypto.randomUUID())
}

