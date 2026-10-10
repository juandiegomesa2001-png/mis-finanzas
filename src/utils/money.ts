import {
  DomainValidationError,
  toMoneyAmount,
  toPositiveMoneyAmount,
  type Currency,
  type MoneyAmount,
  type PositiveMoneyAmount,
} from '../domain'

const MONEY_INPUT_PATTERN = /^(-?)(\d+)(?:[.,](\d{0,2}))?$/

function parseMinorUnits(value: string): number {
  const normalized = value.trim()
  const match = MONEY_INPUT_PATTERN.exec(normalized)

  if (!match) {
    throw new DomainValidationError(
      'Escribe un importe válido con máximo dos decimales.',
    )
  }

  const sign = match[1] === '-' ? -1n : 1n
  const whole = BigInt(match[2] ?? '0')
  const fraction = BigInt((match[3] ?? '').padEnd(2, '0'))
  const minorUnits = sign * (whole * 100n + fraction)

  if (
    minorUnits > BigInt(Number.MAX_SAFE_INTEGER) ||
    minorUnits < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new DomainValidationError('El importe excede el rango permitido.')
  }

  return Number(minorUnits)
}

export function parseMoneyAmount(value: string): MoneyAmount {
  return toMoneyAmount(parseMinorUnits(value))
}

export function parsePositiveMoneyAmount(
  value: string,
): PositiveMoneyAmount {
  return toPositiveMoneyAmount(parseMinorUnits(value))
}

export function formatMoney(
  amount: MoneyAmount | PositiveMoneyAmount,
  currency: Currency,
): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100)
}

