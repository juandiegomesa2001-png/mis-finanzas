import { describe, expect, it } from 'vitest'

import { calculateBudget, calculateSavingsPlan, projectCashFlow, simulateDebtPlan, toCurrency, toDomainDate, toDomainDateTime, toMoneyAmount, toPositiveMoneyAmount, toUuid, type CreditCard, type IncomeSchedule, type RecurringObligation, type SavingsGoal } from '..'

const currency = toCurrency('COP')
const now = toDomainDateTime('2026-01-01T00:00:00.000Z')
const metadata = { createdAt: now, updatedAt: now, revision: 1 as SavingsGoal['revision'] }
const obligation: RecurringObligation = { id: toUuid('86000000-0000-4000-8000-000000000001'), name: 'Arriendo', kind: 'fixed_expense', categoryId: toUuid('86000000-0000-4000-8000-000000000002'), currency, expectedAmount: toPositiveMoneyAmount(300_000), frequency: 'monthly', nextDueDate: toDomainDate('2026-01-10'), status: 'planned', ...metadata }

function creditCard(id: string, name: string, debt: number, rate: number): CreditCard {
  return { id: toUuid(id), bank: 'Banco', name, brand: 'visa', currency, creditLimit: toPositiveMoneyAmount(1_000_000), openingDebt: toMoneyAmount(debt), statementBalance: toMoneyAmount(0), unbilledBalance: toMoneyAmount(0), annualEffectiveRateBps: rate, closingDay: 1, dueDay: 10, minimumPayment: toMoneyAmount(10_000), totalPayment: toMoneyAmount(0), status: 'active', ...metadata }
}

describe('inteligencia financiera', () => {
  it('reserva obligaciones y no incorpora ingresos previstos al disponible', () => {
    const result = calculateBudget({ balance: toMoneyAmount(1_000_000), obligations: [obligation], goals: [], transactions: [], currency, from: toDomainDate('2026-01-01'), to: toDomainDate('2026-01-31'), asOf: toDomainDate('2026-01-01') })
    expect(result.availableAfterObligations).toBe(700_000)
    expect(result.daily).toBe(Math.floor(700_000 / 31))
  })

  it('separa ingreso incierto en el flujo', () => {
    const income: IncomeSchedule = { id: toUuid('87000000-0000-4000-8000-000000000001'), name: 'Salario', amount: toPositiveMoneyAmount(500_000), currency, frequency: 'monthly', nextEstimatedDate: toDomainDate('2026-01-02'), status: 'active', ...metadata }
    const points = projectCashFlow({ openingBalance: toMoneyAmount(1_000_000), from: toDomainDate('2026-01-01'), to: toDomainDate('2026-01-02'), transactions: [], obligations: [], incomes: [income], currency })
    expect(points[1]?.projected).toBe(1_000_000)
    expect(points[1]?.uncertainIncome).toBe(500_000)
  })

  it('ordena avalancha por tasa y bola de nieve por saldo', () => {
    const cards = [creditCard('88000000-0000-4000-8000-000000000001', 'Alta', 500_000, 3_000), creditCard('88000000-0000-4000-8000-000000000002', 'Pequeña', 100_000, 1_000)]
    const common = { cards, purchases: [], payments: [], monthlyCapacity: toMoneyAmount(100_000), reserve: toMoneyAmount(0), asOf: toDomainDate('2026-01-01') }
    expect(simulateDebtPlan({ ...common, strategy: 'avalanche' }).recommendedPayments[0]?.cardId).toBe(cards[0]?.id)
    expect(simulateDebtPlan({ ...common, strategy: 'snowball' }).recommendedPayments[0]?.cardId).toBe(cards[1]?.id)
  })

  it('el modo equilibrado conserva la reserva', () => {
    const card = creditCard('89000000-0000-4000-8000-000000000001', 'A', 500_000, 0)
    const result = simulateDebtPlan({ cards: [card], purchases: [], payments: [], monthlyCapacity: toMoneyAmount(100_000), reserve: toMoneyAmount(40_000), strategy: 'balanced', asOf: toDomainDate('2026-01-01') })
    expect(result.recommendedPayments[0]?.amount).toBe(60_000)
    expect(result.assumptions.join(' ')).toContain('reserva')
  })

  it('un plan de ahorro nunca excede disponible ni meta restante', () => {
    const goal: SavingsGoal = { id: toUuid('8a000000-0000-4000-8000-000000000001'), name: 'Viaje', currency, targetAmount: toPositiveMoneyAmount(100_000), currentAmount: toMoneyAmount(80_000), priority: 'medium', plannedMonthlyContribution: toMoneyAmount(50_000), mode: 'accelerated', status: 'active', ...metadata }
    expect(calculateSavingsPlan(goal, toMoneyAmount(30_000)).contribution).toBe(20_000)
  })
})
