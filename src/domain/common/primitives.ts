declare const brand: unique symbol

type Brand<TValue, TName extends string> = TValue & {
  readonly [brand]: TName
}

export type UUID = Brand<string, 'UUID'>
export type DomainDate = Brand<string, 'DomainDate'>
export type DomainDateTime = Brand<string, 'DomainDateTime'>
export type Currency = Brand<string, 'Currency'>
export type MoneyAmount = Brand<number, 'MoneyAmount'>
export type PositiveMoneyAmount = Brand<number, 'PositiveMoneyAmount'>

export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DomainValidationError'
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DOMAIN_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const CURRENCY_PATTERN = /^[A-Z]{3}$/

export function toUuid(value: string): UUID {
  if (!UUID_PATTERN.test(value)) {
    throw new DomainValidationError('El UUID no tiene un formato válido.')
  }

  return value as UUID
}

export function toDomainDate(value: string): DomainDate {
  const match = DOMAIN_DATE_PATTERN.exec(value)

  if (!match) {
    throw new DomainValidationError('La fecha debe usar el formato YYYY-MM-DD.')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) {
    throw new DomainValidationError('La fecha no existe en el calendario.')
  }

  return value as DomainDate
}

export function toDomainDateTime(value: string): DomainDateTime {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new DomainValidationError(
      'La fecha y hora debe ser una marca ISO 8601 canónica en UTC.',
    )
  }

  return value as DomainDateTime
}

export function toCurrency(value: string): Currency {
  if (!CURRENCY_PATTERN.test(value)) {
    throw new DomainValidationError(
      'La moneda debe ser un código ISO 4217 de tres letras mayúsculas.',
    )
  }

  return value as Currency
}

export function toMoneyAmount(value: number): MoneyAmount {
  if (!Number.isSafeInteger(value)) {
    throw new DomainValidationError(
      'El importe debe ser un entero seguro expresado en unidades menores.',
    )
  }

  return value as MoneyAmount
}

export function toPositiveMoneyAmount(value: number): PositiveMoneyAmount {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new DomainValidationError(
      'El importe del movimiento debe ser un entero seguro mayor que cero.',
    )
  }

  return value as PositiveMoneyAmount
}

export function isMoneyAmount(value: unknown): value is MoneyAmount {
  return typeof value === 'number' && Number.isSafeInteger(value)
}

export function isPositiveMoneyAmount(
  value: unknown,
): value is PositiveMoneyAmount {
  return isMoneyAmount(value) && value > 0
}

export function checkedMoneySum(
  ...amounts: readonly MoneyAmount[]
): MoneyAmount {
  let total = 0

  for (const amount of amounts) {
    if (!isMoneyAmount(amount)) {
      throw new DomainValidationError('Se intentó sumar un importe no válido.')
    }

    total += amount

    if (!Number.isSafeInteger(total)) {
      throw new DomainValidationError(
        'El resultado monetario excede el rango de enteros seguros.',
      )
    }
  }

  return total as MoneyAmount
}

