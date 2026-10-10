import { addMonths, format } from 'date-fns'

import { checkedMoneySum, toDomainDate, toMoneyAmount, type DomainDate, type MoneyAmount } from '../common/primitives'
import type { CardPayment, CreditCard, InstallmentPurchase, InstallmentSchedule } from './models'

export function monthlyRateFromEffectiveAnnual(rateBps: number): number {
  if (!Number.isSafeInteger(rateBps) || rateBps < 0) throw new Error('La tasa debe expresarse en puntos básicos no negativos.')
  return Math.pow(1 + rateBps / 10_000, 1 / 12) - 1
}

export function createInstallmentPlan(purchase: Pick<InstallmentPurchase, 'id' | 'amount' | 'installmentCount' | 'annualEffectiveRateBps' | 'purchaseDate'>, createId: () => InstallmentSchedule['id'], now: InstallmentSchedule['createdAt']): InstallmentSchedule[] {
  if (!Number.isSafeInteger(purchase.installmentCount) || purchase.installmentCount < 1 || purchase.installmentCount > 120) throw new Error('El número de cuotas debe estar entre 1 y 120.')
  const rate = monthlyRateFromEffectiveAnnual(purchase.annualEffectiveRateBps ?? 0)
  const rawPayment = rate === 0 ? purchase.amount / purchase.installmentCount : purchase.amount * (rate * Math.pow(1 + rate, purchase.installmentCount)) / (Math.pow(1 + rate, purchase.installmentCount) - 1)
  let remaining: number = purchase.amount
  const start = new Date(`${purchase.purchaseDate}T12:00:00`)
  const rows: InstallmentSchedule[] = []
  for (let index = 1; index <= purchase.installmentCount; index += 1) {
    const interest = toMoneyAmount(Math.round(remaining * rate))
    const principal = toMoneyAmount(index === purchase.installmentCount ? remaining : Math.min(remaining, Math.max(0, Math.round(rawPayment - interest))))
    remaining = toMoneyAmount(remaining - principal)
    rows.push({ id: createId(), purchaseId: purchase.id, installmentNumber: index, dueDate: toDomainDate(format(addMonths(start, index), 'yyyy-MM-dd')), principal, interest, status: 'pending', createdAt: now, updatedAt: now, revision: 1 as InstallmentSchedule['revision'] })
  }
  return rows
}

export function calculateCardDebt(card: CreditCard, purchases: readonly InstallmentPurchase[], entries: readonly CardPayment[]): MoneyAmount {
  let debt = card.openingDebt
  for (const purchase of purchases) if (purchase.cardId === card.id && purchase.status !== 'voided') debt = checkedMoneySum(debt, toMoneyAmount(purchase.amount), purchase.financeCharges)
  for (const entry of entries) {
    if (entry.cardId !== card.id || entry.status !== 'confirmed') continue
    const increases = entry.type === 'interest' || entry.type === 'fee' || entry.type === 'adjustment_increase'
    debt = checkedMoneySum(debt, toMoneyAmount((increases ? 1 : -1) * entry.amount))
  }
  return debt
}

export function nextCardDate(day: number, from: DomainDate): DomainDate {
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('El día debe estar entre 1 y 31.')
  const start = new Date(`${from}T12:00:00`)
  let year = start.getFullYear()
  let month = start.getMonth()
  const value = Math.min(day, new Date(year, month + 1, 0).getDate())
  if (start.getDate() > value) {
    month += 1
    if (month === 12) { month = 0; year += 1 }
  }
  const resolved = Math.min(day, new Date(year, month + 1, 0).getDate())
  return toDomainDate(format(new Date(year, month, resolved), 'yyyy-MM-dd'))
}

