import { describe, expect, it } from 'vitest'

import {
  checkedMoneySum,
  DomainValidationError,
  toCurrency,
  toDomainDate,
  toDomainDateTime,
  toMoneyAmount,
  toPositiveMoneyAmount,
  toUuid,
} from './primitives'
import {
  incrementRevision,
  INITIAL_REVISION,
  toRevision,
} from './revision'

describe('tipos primitivos del dominio', () => {
  it('acepta identificadores UUID canónicos', () => {
    expect(toUuid('10000000-0000-4000-8000-000000000001')).toBe(
      '10000000-0000-4000-8000-000000000001',
    )
  })

  it('rechaza identificadores que no son UUID', () => {
    expect(() => toUuid('cuenta-1')).toThrow(DomainValidationError)
  })

  it('acepta fechas de calendario válidas, incluido un día bisiesto', () => {
    expect(toDomainDate('2028-02-29')).toBe('2028-02-29')
  })

  it('rechaza fechas inexistentes', () => {
    expect(() => toDomainDate('2026-02-29')).toThrow(DomainValidationError)
  })

  it('acepta marcas de tiempo UTC canónicas', () => {
    expect(toDomainDateTime('2026-01-01T00:00:00.000Z')).toBe(
      '2026-01-01T00:00:00.000Z',
    )
  })

  it('rechaza marcas de tiempo ambiguas', () => {
    expect(() => toDomainDateTime('2026-01-01')).toThrow(
      DomainValidationError,
    )
  })

  it('exige códigos de moneda de tres letras mayúsculas', () => {
    expect(toCurrency('COP')).toBe('COP')
    expect(() => toCurrency('cop')).toThrow(DomainValidationError)
  })

  it('permite saldo inicial cero o negativo si es un entero seguro', () => {
    expect(toMoneyAmount(0)).toBe(0)
    expect(toMoneyAmount(-1_000)).toBe(-1_000)
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
    'rechaza el importe no positivo o inseguro %s para movimientos',
    (amount) => {
      expect(() => toPositiveMoneyAmount(amount)).toThrow(
        DomainValidationError,
      )
    },
  )

  it('detecta desbordamientos en sumas monetarias', () => {
    expect(() =>
      checkedMoneySum(
        toMoneyAmount(Number.MAX_SAFE_INTEGER),
        toMoneyAmount(1),
      ),
    ).toThrow(DomainValidationError)
  })
})

describe('revision', () => {
  it('comienza en uno', () => {
    expect(INITIAL_REVISION).toBe(1)
  })

  it('incrementa exactamente en uno', () => {
    expect(incrementRevision(toRevision(7))).toBe(8)
  })

  it.each([0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    'rechaza revisiones inválidas: %s',
    (revision) => {
      expect(() => toRevision(revision)).toThrow(DomainValidationError)
    },
  )

  it('rechaza el incremento que excede el entero seguro', () => {
    expect(() => incrementRevision(toRevision(Number.MAX_SAFE_INTEGER))).toThrow(
      DomainValidationError,
    )
  })
})

