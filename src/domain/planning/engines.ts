import { addMonths, differenceInCalendarDays, format } from "date-fns";

import {
  checkedMoneySum,
  toDomainDate,
  toMoneyAmount,
  type Currency,
  type DomainDate,
  type MoneyAmount,
  type UUID,
} from "../common/primitives";
import type { IncomeSchedule } from "../incomeSchedules/incomeSchedule";
import type {
  CreditCard,
  RecurringObligation,
  SavingsGoal,
} from "../obligations/models";
import {
  calculateCardDebt,
  monthlyRateFromEffectiveAnnual,
} from "../obligations/calculations";
import type { CardPayment, InstallmentPurchase } from "../obligations/models";
import type { Transaction } from "../transactions/transaction";

export interface BudgetResult {
  readonly availableAfterObligations: MoneyAmount;
  readonly daily: MoneyAmount;
  readonly weekly: MoneyAmount;
  readonly monthlyRemaining: MoneyAmount;
  readonly averageDailyExpense: MoneyAmount;
  readonly projectedExpense: MoneyAmount;
  readonly surplus: MoneyAmount;
  readonly deficit: MoneyAmount;
  readonly daysCovered: number;
}

export function calculateBudget(input: {
  balance: MoneyAmount;
  obligations: readonly RecurringObligation[];
  goals: readonly SavingsGoal[];
  transactions: readonly Transaction[];
  currency: Currency;
  from: DomainDate;
  to: DomainDate;
  asOf?: DomainDate;
}): BudgetResult {
  const activeObligations = input.obligations.filter(
    (item) =>
      item.currency === input.currency &&
      item.status !== "paid" &&
      item.status !== "paused" &&
      item.status !== "cancelled" &&
      item.nextDueDate >= input.from &&
      item.nextDueDate <= input.to,
  );
  const obligationsTotal = activeObligations.reduce(
    (sum, item) =>
      checkedMoneySum(
        sum,
        toMoneyAmount(item.billedAmount ?? item.expectedAmount),
      ),
    toMoneyAmount(0),
  );
  const goalReserve = input.goals
    .filter(
      (goal) => goal.currency === input.currency && goal.status === "active",
    )
    .reduce(
      (sum, goal) => checkedMoneySum(sum, goal.plannedMonthlyContribution),
      toMoneyAmount(0),
    );
  const available = checkedMoneySum(
    input.balance,
    toMoneyAmount(-obligationsTotal),
    toMoneyAmount(-goalReserve),
  );
  const expenses = input.transactions
    .filter(
      (item) =>
        item.type === "expense" &&
        item.status === "confirmed" &&
        item.currency === input.currency &&
        item.effectiveDate >= input.from &&
        item.effectiveDate <= input.to,
    )
    .reduce(
      (sum, item) => checkedMoneySum(sum, toMoneyAmount(item.amount)),
      toMoneyAmount(0),
    );
  const today = toDomainDate(format(new Date(), "yyyy-MM-dd"));
  const asOf =
    input.asOf ??
    (today < input.from ? input.from : today > input.to ? input.to : today);
  const elapsed = Math.max(
    1,
    differenceInCalendarDays(
      new Date(`${asOf}T12:00:00`),
      new Date(`${input.from}T12:00:00`),
    ) + 1,
  );
  const remainingDays = Math.max(
    1,
    differenceInCalendarDays(
      new Date(`${input.to}T12:00:00`),
      new Date(`${asOf}T12:00:00`),
    ) + 1,
  );
  const average = toMoneyAmount(Math.round(expenses / elapsed));
  const projected = toMoneyAmount(average * remainingDays);
  const monthlyRemaining = checkedMoneySum(
    available,
    toMoneyAmount(-projected),
  );
  return {
    availableAfterObligations: available,
    daily: toMoneyAmount(Math.floor(Math.max(0, available) / remainingDays)),
    weekly: toMoneyAmount(
      Math.floor(Math.max(0, available) / remainingDays) *
        Math.min(7, remainingDays),
    ),
    monthlyRemaining,
    averageDailyExpense: average,
    projectedExpense: projected,
    surplus: toMoneyAmount(Math.max(0, monthlyRemaining)),
    deficit: toMoneyAmount(Math.max(0, -monthlyRemaining)),
    daysCovered: remainingDays,
  };
}

export interface CashFlowPoint {
  readonly date: DomainDate;
  readonly confirmed: MoneyAmount;
  readonly projected: MoneyAmount;
  readonly uncertainIncome: MoneyAmount;
}
export function projectCashFlow(input: {
  openingBalance: MoneyAmount;
  from: DomainDate;
  to: DomainDate;
  transactions: readonly Transaction[];
  obligations: readonly RecurringObligation[];
  incomes: readonly IncomeSchedule[];
  currency: Currency;
}): CashFlowPoint[] {
  let confirmed = input.openingBalance;
  let projected = input.openingBalance;
  const points: CashFlowPoint[] = [];
  for (
    let date = new Date(`${input.from}T12:00:00`);
    format(date, "yyyy-MM-dd") <= input.to;
    date.setDate(date.getDate() + 1)
  ) {
    const key = toDomainDate(format(date, "yyyy-MM-dd"));
    const movements = input.transactions.filter(
      (item) =>
        item.status === "confirmed" &&
        item.currency === input.currency &&
        item.effectiveDate === key,
    );
    for (const item of movements) {
      if (item.type === "income")
        confirmed = checkedMoneySum(confirmed, toMoneyAmount(item.amount));
      if (item.type === "expense")
        confirmed = checkedMoneySum(confirmed, toMoneyAmount(-item.amount));
    }
    projected = confirmed;
    const due = input.obligations
      .filter(
        (item) =>
          item.currency === input.currency &&
          item.nextDueDate === key &&
          !["paid", "paused", "cancelled"].includes(item.status),
      )
      .reduce(
        (sum, item) =>
          checkedMoneySum(
            sum,
            toMoneyAmount(item.billedAmount ?? item.expectedAmount),
          ),
        toMoneyAmount(0),
      );
    projected = checkedMoneySum(projected, toMoneyAmount(-due));
    const uncertainIncome = input.incomes
      .filter(
        (item) =>
          item.currency === input.currency &&
          item.status === "active" &&
          item.nextEstimatedDate === key,
      )
      .reduce(
        (sum, item) => checkedMoneySum(sum, toMoneyAmount(item.amount)),
        toMoneyAmount(0),
      );
    points.push({ date: key, confirmed, projected, uncertainIncome });
  }
  return points;
}

export type DebtStrategy = "avalanche" | "snowball" | "balanced";
export interface DebtPlan {
  readonly strategy: DebtStrategy;
  readonly recommendedPayments: readonly {
    cardId: UUID;
    amount: MoneyAmount;
  }[];
  readonly estimatedMonths: number;
  readonly estimatedInterest: MoneyAmount;
  readonly payoffDate?: DomainDate;
  readonly assumptions: readonly string[];
}
export function simulateDebtPlan(input: {
  cards: readonly CreditCard[];
  purchases: readonly InstallmentPurchase[];
  payments: readonly CardPayment[];
  monthlyCapacity: MoneyAmount;
  reserve: MoneyAmount;
  strategy: DebtStrategy;
  asOf: DomainDate;
}): DebtPlan {
  const debts = input.cards
    .filter((card) => card.status === "active")
    .map((card) => ({
      card,
      balance: Math.max(
        0,
        calculateCardDebt(card, input.purchases, input.payments),
      ),
    }));
  const capacity = Math.max(
    0,
    input.monthlyCapacity - (input.strategy === "balanced" ? input.reserve : 0),
  );
  const sorted = [...debts].sort((a, b) =>
    input.strategy === "snowball"
      ? a.balance - b.balance
      : (b.card.annualEffectiveRateBps ?? -1) -
        (a.card.annualEffectiveRateBps ?? -1),
  );
  const recommendedPayments = sorted.map(({ card, balance }, index) => ({
    cardId: card.id,
    amount: toMoneyAmount(
      Math.min(
        balance,
        Math.max(
          card.minimumPayment,
          index === 0
            ? capacity -
                debts.reduce((sum, item) => sum + item.card.minimumPayment, 0) +
                card.minimumPayment
            : card.minimumPayment,
        ),
      ),
    ),
  }));
  let balances = sorted.map(({ card, balance }) => ({ card, balance }));
  let interestTotal = 0;
  let months = 0;
  while (
    balances.some((item) => item.balance > 0) &&
    months < 600 &&
    capacity > 0
  ) {
    months += 1;
    balances = balances.map((item) => {
      const interest = Math.round(
        item.balance *
          monthlyRateFromEffectiveAnnual(item.card.annualEffectiveRateBps ?? 0),
      );
      interestTotal += interest;
      return { ...item, balance: item.balance + interest };
    });
    let remaining = capacity;
    for (const item of balances) {
      const payment = Math.min(
        item.balance,
        Math.min(remaining, item.card.minimumPayment),
      );
      item.balance -= payment;
      remaining -= payment;
    }
    const target = balances.find((item) => item.balance > 0);
    if (target && remaining > 0)
      target.balance -= Math.min(target.balance, remaining);
  }
  return {
    strategy: input.strategy,
    recommendedPayments,
    estimatedMonths: months,
    estimatedInterest: toMoneyAmount(interestTotal),
    ...(months < 600
      ? {
          payoffDate: toDomainDate(
            format(
              addMonths(new Date(`${input.asOf}T12:00:00`), months),
              "yyyy-MM-dd",
            ),
          ),
        }
      : {}),
    assumptions: [
      "Tasas efectivas anuales convertidas a tasa mensual.",
      "No se agregan compras nuevas.",
      "La capacidad mensual se mantiene constante.",
      ...(input.strategy === "balanced"
        ? ["La reserva se conserva antes de abonar a deuda."]
        : []),
    ],
  };
}

export function calculateSavingsPlan(
  goal: SavingsGoal,
  availableMonthly: MoneyAmount,
): {
  contribution: MoneyAmount;
  months: number | null;
  projectedDate?: DomainDate;
} {
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const factor =
    goal.mode === "flexible" ? 0.5 : goal.mode === "accelerated" ? 1 : 0.75;
  const contribution = toMoneyAmount(
    Math.max(
      0,
      Math.min(
        remaining,
        Math.floor(availableMonthly * factor),
        goal.plannedMonthlyContribution || remaining,
      ),
    ),
  );
  const months =
    remaining === 0
      ? 0
      : contribution > 0
        ? Math.ceil(remaining / contribution)
        : null;
  return { contribution, months };
}
