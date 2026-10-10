import { database, type FinanceDatabase } from "../database/financeDatabase";
import {
  assertValidTransaction,
  calculateCardDebt,
  createInstallmentPlan,
  incrementRevision,
  INITIAL_REVISION,
  nextCardDate,
  toMoneyAmount,
  toDomainDate,
  type CardEntryType,
  type CardPayment,
  type CardStatement,
  type CreditCard,
  type Currency,
  type DomainDate,
  type InstallmentPurchase,
  type PositiveMoneyAmount,
  type RecurringObligation,
  type Reminder,
  type Revision,
  type SavingsGoal,
  type Transaction,
  type TransactionCandidate,
  type UUID,
} from "../domain";
import { currentDomainDateTime, todayDomainDate } from "../utils/dates";
import { createUuid } from "../utils/identifiers";

function required(value: string, label: string): string {
  const clean = value.trim();
  if (!clean) throw new Error(`${label} es obligatorio.`);
  return clean;
}

function checkRevision(current: Revision, expected: Revision): void {
  if (current !== expected)
    throw new Error(
      "El registro cambió. Actualiza la vista antes de continuar.",
    );
}

export interface CreateCardInput {
  readonly id?: UUID;
  readonly bank: string;
  readonly name: string;
  readonly brand: CreditCard["brand"];
  readonly lastFour?: string;
  readonly currency: Currency;
  readonly creditLimit: PositiveMoneyAmount;
  readonly openingDebt: CreditCard["openingDebt"];
  readonly statementBalance: CreditCard["statementBalance"];
  readonly unbilledBalance: CreditCard["unbilledBalance"];
  readonly annualEffectiveRateBps?: number;
  readonly closingDay: number;
  readonly dueDay: number;
  readonly minimumPayment: CreditCard["minimumPayment"];
  readonly totalPayment: CreditCard["totalPayment"];
  readonly usualPaymentAccountId?: UUID;
}

export interface PurchaseInput {
  readonly id?: UUID;
  readonly transactionId?: UUID;
  readonly cardId: UUID;
  readonly categoryId: UUID;
  readonly description: string;
  readonly purchaseDate: DomainDate;
  readonly amount: PositiveMoneyAmount;
  readonly installmentCount: number;
  readonly annualEffectiveRateBps?: number;
  readonly financeCharges?: InstallmentPurchase["financeCharges"];
}

export interface CardEntryInput {
  readonly id?: UUID;
  readonly transactionId?: UUID;
  readonly cardId: UUID;
  readonly type: CardEntryType;
  readonly amount: PositiveMoneyAmount;
  readonly effectiveDate: DomainDate;
  readonly paymentAccountId?: UUID;
  readonly categoryId?: UUID;
  readonly description?: string;
}

export class ObligationService {
  private readonly db: FinanceDatabase;
  constructor(db: FinanceDatabase) {
    this.db = db;
  }

  async createCard(input: CreateCardInput): Promise<CreditCard> {
    if (input.lastFour && !/^\d{4}$/.test(input.lastFour))
      throw new Error(
        "Los últimos cuatro dígitos deben contener exactamente cuatro números.",
      );
    if (
      ![input.closingDay, input.dueDay].every(
        (day) => Number.isInteger(day) && day >= 1 && day <= 31,
      )
    )
      throw new Error(
        "Las fechas de corte y pago deben usar días entre 1 y 31.",
      );
    if (
      input.annualEffectiveRateBps !== undefined &&
      (!Number.isSafeInteger(input.annualEffectiveRateBps) ||
        input.annualEffectiveRateBps < 0)
    )
      throw new Error("La tasa efectiva anual no es válida.");
    if (
      input.usualPaymentAccountId &&
      !(await this.db.accounts.get(input.usualPaymentAccountId))
    )
      throw new Error("La cuenta habitual de pago no existe.");
    const now = currentDomainDateTime();
    const card: CreditCard = {
      ...input,
      id: input.id ?? createUuid(),
      bank: required(input.bank, "El banco"),
      name: required(input.name, "El nombre"),
      status: "active",
      createdAt: now,
      updatedAt: now,
      revision: INITIAL_REVISION,
    };
    await this.db.creditCards.add(card);
    return card;
  }

  async updateCard(
    id: UUID,
    expectedRevision: Revision,
    changes: Partial<Omit<CreateCardInput, "id" | "currency">>,
  ): Promise<CreditCard> {
    return this.db.transaction("rw", this.db.creditCards, async () => {
      const current = await this.db.creditCards.get(id);
      if (!current) throw new Error("La tarjeta no existe.");
      checkRevision(current.revision, expectedRevision);
      const next = {
        ...current,
        ...changes,
        updatedAt: currentDomainDateTime(),
        revision: incrementRevision(current.revision),
      };
      await this.db.creditCards.put(next);
      return next;
    });
  }

  async reconcileStatement(input: {
    readonly cardId: UUID;
    readonly expectedRevision: Revision;
    readonly periodEnd: DomainDate;
    readonly dueDate: DomainDate;
    readonly statementBalance: CardStatement["statementBalance"];
    readonly unbilledBalance: CardStatement["unbilledBalance"];
    readonly minimumPayment: CardStatement["minimumPayment"];
    readonly totalPayment: CardStatement["totalPayment"];
  }): Promise<CardStatement> {
    return this.db.transaction(
      "rw",
      [this.db.creditCards, this.db.cardStatements],
      async () => {
        const card = await this.db.creditCards.get(input.cardId);
        if (!card) throw new Error("La tarjeta no existe.");
        checkRevision(card.revision, input.expectedRevision);
        const now = currentDomainDateTime();
        const statement: CardStatement = {
          id: createUuid(),
          cardId: card.id,
          periodEnd: input.periodEnd,
          dueDate: input.dueDate,
          statementBalance: input.statementBalance,
          unbilledBalance: input.unbilledBalance,
          minimumPayment: input.minimumPayment,
          totalPayment: input.totalPayment,
          status: "reconciled",
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };
        await this.db.cardStatements.add(statement);
        await this.db.creditCards.put({
          ...card,
          statementBalance: input.statementBalance,
          unbilledBalance: input.unbilledBalance,
          minimumPayment: input.minimumPayment,
          totalPayment: input.totalPayment,
          updatedAt: now,
          revision: incrementRevision(card.revision),
        });
        return statement;
      },
    );
  }

  async createPurchase(input: PurchaseInput): Promise<InstallmentPurchase> {
    return this.db.transaction(
      "rw",
      [
        this.db.creditCards,
        this.db.accounts,
        this.db.categories,
        this.db.transactions,
        this.db.installmentPurchases,
        this.db.installmentSchedules,
      ],
      async () => {
        const card = await this.db.creditCards.get(input.cardId);
        if (!card || card.status !== "active")
          throw new Error("La tarjeta no está disponible.");
        const category = await this.db.categories.get(input.categoryId);
        if (
          !category ||
          category.kind !== "expense" ||
          category.status !== "active"
        )
          throw new Error("La categoría de gasto no está disponible.");
        const now = currentDomainDateTime();
        const purchaseId = input.id ?? createUuid();
        const transactionId = input.transactionId ?? createUuid();
        const transactionCandidate: TransactionCandidate = {
          id: transactionId,
          type: "expense",
          status: "confirmed",
          amount: input.amount,
          currency: card.currency,
          effectiveDate: input.purchaseDate,
          description: required(input.description, "La descripción"),
          categoryId: input.categoryId,
          creditCardId: card.id,
          relatedEntityId: purchaseId,
          confirmedAt: now,
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };
        assertValidTransaction(
          transactionCandidate,
          await this.db.accounts.toArray(),
        );
        const purchase: InstallmentPurchase = {
          id: purchaseId,
          cardId: card.id,
          transactionId,
          description: required(input.description, "La descripción"),
          purchaseDate: input.purchaseDate,
          amount: input.amount,
          currency: card.currency,
          installmentCount: input.installmentCount,
          ...(input.annualEffectiveRateBps !== undefined
            ? { annualEffectiveRateBps: input.annualEffectiveRateBps }
            : {}),
          financeCharges: input.financeCharges ?? toMoneyAmount(0),
          paidInstallments: 0,
          status: "active",
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };
        const plan = createInstallmentPlan(purchase, createUuid, now);
        await this.db.transactions.add(transactionCandidate as Transaction);
        await this.db.installmentPurchases.add(purchase);
        await this.db.installmentSchedules.bulkAdd(plan);
        return purchase;
      },
    );
  }

  async recordCardEntry(input: CardEntryInput): Promise<CardPayment> {
    return this.db.transaction(
      "rw",
      this.db.creditCards,
      this.db.accounts,
      this.db.categories,
      this.db.transactions,
      this.db.cardPayments,
      async () => {
        const card = await this.db.creditCards.get(input.cardId);
        if (!card) throw new Error("La tarjeta no existe.");
        const principal = [
          "minimum_payment",
          "total_payment",
          "extra_payment",
        ].includes(input.type);
        const expense = input.type === "interest" || input.type === "fee";
        if (principal && !input.paymentAccountId)
          throw new Error("El pago principal requiere una cuenta de origen.");
        const account = input.paymentAccountId
          ? await this.db.accounts.get(input.paymentAccountId)
          : undefined;
        if (
          input.paymentAccountId &&
          (!account || account.currency !== card.currency)
        )
          throw new Error("La cuenta de pago no existe o usa otra moneda.");
        if (expense) {
          const category = input.categoryId
            ? await this.db.categories.get(input.categoryId)
            : undefined;
          if (!category || category.kind !== "expense")
            throw new Error(
              "Los intereses y cargos requieren categoría de gasto.",
            );
        }
        const now = currentDomainDateTime();
        const id = input.id ?? createUuid();
        const transactionId =
          principal || expense
            ? (input.transactionId ?? createUuid())
            : undefined;
        const entry: CardPayment = {
          id,
          cardId: card.id,
          type: input.type,
          amount: input.amount,
          currency: card.currency,
          effectiveDate: input.effectiveDate,
          ...(input.paymentAccountId
            ? { paymentAccountId: input.paymentAccountId }
            : {}),
          ...(transactionId ? { transactionId } : {}),
          ...(input.description?.trim()
            ? { description: input.description.trim() }
            : {}),
          status: "confirmed",
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };
        if (principal && account && transactionId) {
          const candidate: TransactionCandidate = {
            id: transactionId,
            type: "adjustment",
            status: "confirmed",
            amount: input.amount,
            currency: card.currency,
            effectiveDate: input.effectiveDate,
            accountId: account.id,
            adjustmentDirection: "outflow",
            relatedEntityId: id,
            description: input.description ?? `Pago de ${card.name}`,
            confirmedAt: now,
            createdAt: now,
            updatedAt: now,
            revision: INITIAL_REVISION,
          };
          assertValidTransaction(candidate, [account]);
          await this.db.transactions.add(candidate as Transaction);
        } else if (expense && transactionId && input.categoryId) {
          const candidate: TransactionCandidate = {
            id: transactionId,
            type: "expense",
            status: "confirmed",
            amount: input.amount,
            currency: card.currency,
            effectiveDate: input.effectiveDate,
            creditCardId: card.id,
            categoryId: input.categoryId,
            relatedEntityId: id,
            description:
              input.description ??
              (input.type === "interest"
                ? "Intereses de tarjeta"
                : "Cargo de tarjeta"),
            confirmedAt: now,
            createdAt: now,
            updatedAt: now,
            revision: INITIAL_REVISION,
          };
          assertValidTransaction(candidate, await this.db.accounts.toArray());
          await this.db.transactions.add(candidate as Transaction);
        }
        await this.db.cardPayments.add(entry);
        return entry;
      },
    );
  }

  async createObligation(
    input: Omit<
      RecurringObligation,
      keyof import("../domain").EntityMetadata | "id" | "status"
    > & { readonly id?: UUID; readonly status?: RecurringObligation["status"] },
  ): Promise<RecurringObligation> {
    return this.db.transaction(
      "rw",
      [this.db.recurringObligations, this.db.categories, this.db.accounts],
      async () => {
        const category = await this.db.categories.get(input.categoryId);
        if (!category || category.kind !== "expense")
          throw new Error("La categoría de la obligación no es válida.");
        if (input.paymentAccountId) {
          const account = await this.db.accounts.get(input.paymentAccountId);
          if (!account || account.currency !== input.currency)
            throw new Error("La cuenta de pago no existe o usa otra moneda.");
        }
        const now = currentDomainDateTime();
        const obligation: RecurringObligation = {
          ...input,
          id: input.id ?? createUuid(),
          name: required(input.name, "El nombre"),
          status: input.status ?? "planned",
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };
        await this.db.recurringObligations.add(obligation);
        return obligation;
      },
    );
  }

  async billObligation(
    id: UUID,
    expectedRevision: Revision,
    amount: PositiveMoneyAmount,
  ): Promise<RecurringObligation> {
    return this.db.transaction("rw", this.db.recurringObligations, async () => {
      const current = await this.db.recurringObligations.get(id);
      if (!current) throw new Error("La obligación no existe.");
      checkRevision(current.revision, expectedRevision);
      const next: RecurringObligation = {
        ...current,
        billedAmount: amount,
        status: "billed",
        updatedAt: currentDomainDateTime(),
        revision: incrementRevision(current.revision),
      };
      await this.db.recurringObligations.put(next);
      return next;
    });
  }

  async advanceObligation(
    id: UUID,
    expectedRevision: Revision,
    variableNextDate?: DomainDate,
  ): Promise<RecurringObligation> {
    return this.db.transaction("rw", this.db.recurringObligations, async () => {
      const current = await this.db.recurringObligations.get(id);
      if (!current) throw new Error("La obligación no existe.");
      checkRevision(current.revision, expectedRevision);
      if (current.status !== "paid")
        throw new Error("Solo una obligación pagada puede avanzar de ciclo.");
      const base = new Date(`${current.nextDueDate}T12:00:00`);
      const nextDate =
        current.frequency === "variable"
          ? variableNextDate
          : toDomainDate(
              format(
                current.frequency === "weekly"
                  ? addWeeks(base, 1)
                  : current.frequency === "quarterly"
                    ? addMonths(base, 3)
                    : current.frequency === "yearly"
                      ? addYears(base, 1)
                      : addMonths(base, 1),
                "yyyy-MM-dd",
              ),
            );
      if (!nextDate)
        throw new Error(
          "Indica la próxima fecha para una obligación variable.",
        );
      const { billedAmount: _billedAmount, ...withoutBill } = current;
      void _billedAmount;
      const next: RecurringObligation = {
        ...withoutBill,
        nextDueDate: nextDate,
        status: "planned",
        updatedAt: currentDomainDateTime(),
        revision: incrementRevision(current.revision),
      };
      await this.db.recurringObligations.put(next);
      return next;
    });
  }

  async markInstallmentPaid(
    id: UUID,
    expectedRevision: Revision,
  ): Promise<void> {
    await this.db.transaction(
      "rw",
      [this.db.installmentSchedules, this.db.installmentPurchases],
      async () => {
        const schedule = await this.db.installmentSchedules.get(id);
        if (!schedule) throw new Error("La cuota no existe.");
        checkRevision(schedule.revision, expectedRevision);
        if (schedule.status === "paid")
          throw new Error("La cuota ya está pagada.");
        const purchase = await this.db.installmentPurchases.get(
          schedule.purchaseId,
        );
        if (!purchase || purchase.status === "voided")
          throw new Error("La compra no está activa.");
        const now = currentDomainDateTime();
        const paidInstallments = purchase.paidInstallments + 1;
        await this.db.installmentSchedules.put({
          ...schedule,
          status: "paid",
          updatedAt: now,
          revision: incrementRevision(schedule.revision),
        });
        await this.db.installmentPurchases.put({
          ...purchase,
          paidInstallments,
          status:
            paidInstallments >= purchase.installmentCount ? "paid" : "active",
          updatedAt: now,
          revision: incrementRevision(purchase.revision),
        });
      },
    );
  }

  async markObligationPaid(
    id: UUID,
    expectedRevision: Revision,
    paymentAccountId: UUID,
  ): Promise<RecurringObligation> {
    return this.db.transaction(
      "rw",
      this.db.recurringObligations,
      this.db.accounts,
      this.db.categories,
      this.db.transactions,
      async () => {
        const current = await this.db.recurringObligations.get(id);
        if (!current) throw new Error("La obligación no existe.");
        checkRevision(current.revision, expectedRevision);
        const account = await this.db.accounts.get(paymentAccountId);
        const category = await this.db.categories.get(current.categoryId);
        if (
          !account ||
          account.currency !== current.currency ||
          !category ||
          category.kind !== "expense"
        )
          throw new Error("La cuenta o categoría de pago no es válida.");
        const now = currentDomainDateTime();
        const transactionId = createUuid();
        const amount = current.billedAmount ?? current.expectedAmount;
        const candidate: TransactionCandidate = {
          id: transactionId,
          type: "expense",
          status: "confirmed",
          amount,
          currency: current.currency,
          effectiveDate: todayDomainDate(),
          sourceAccountId: account.id,
          categoryId: current.categoryId,
          relatedEntityId: current.id,
          description: current.name,
          confirmedAt: now,
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };
        assertValidTransaction(candidate, [account]);
        await this.db.transactions.add(candidate as Transaction);
        const next = {
          ...current,
          status: "paid" as const,
          paymentAccountId,
          lastPaymentTransactionId: transactionId,
          updatedAt: now,
          revision: incrementRevision(current.revision),
        };
        await this.db.recurringObligations.put(next);
        return next;
      },
    );
  }

  async createSavingsGoal(
    input: Omit<
      SavingsGoal,
      keyof import("../domain").EntityMetadata | "id" | "status"
    > & { readonly id?: UUID },
  ): Promise<SavingsGoal> {
    if (
      Number(input.currentAmount) < 0 ||
      Number(input.currentAmount) > Number(input.targetAmount)
    )
      throw new Error("El ahorro actual debe estar entre cero y la meta.");
    const now = currentDomainDateTime();
    const goal: SavingsGoal = {
      ...input,
      id: input.id ?? createUuid(),
      name: required(input.name, "El nombre"),
      status:
        Number(input.currentAmount) === Number(input.targetAmount)
          ? "completed"
          : "active",
      createdAt: now,
      updatedAt: now,
      revision: INITIAL_REVISION,
    };
    await this.db.savingsGoals.add(goal);
    return goal;
  }

  async contributeToGoal(
    id: UUID,
    expectedRevision: Revision,
    amount: PositiveMoneyAmount,
  ): Promise<SavingsGoal> {
    return this.db.transaction("rw", this.db.savingsGoals, async () => {
      const current = await this.db.savingsGoals.get(id);
      if (!current) throw new Error("La meta no existe.");
      checkRevision(current.revision, expectedRevision);
      const nextAmount = toMoneyAmount(
        Math.min(current.targetAmount, current.currentAmount + amount),
      );
      const next: SavingsGoal = {
        ...current,
        currentAmount: nextAmount,
        status: nextAmount >= current.targetAmount ? "completed" : "active",
        updatedAt: currentDomainDateTime(),
        revision: incrementRevision(current.revision),
      };
      await this.db.savingsGoals.put(next);
      return next;
    });
  }

  async refreshReminders(
    asOf = todayDomainDate(),
  ): Promise<readonly Reminder[]> {
    return this.db.transaction(
      "rw",
      this.db.creditCards,
      this.db.recurringObligations,
      this.db.savingsGoals,
      this.db.reminders,
      async () => {
        const [cards, obligations, goals, existing] = await Promise.all([
          this.db.creditCards.toArray(),
          this.db.recurringObligations.toArray(),
          this.db.savingsGoals.toArray(),
          this.db.reminders.toArray(),
        ]);
        const now = currentDomainDateTime();
        const byKey = new Map(existing.map((item) => [item.sourceKey, item]));
        const candidates: Omit<
          Reminder,
          "id" | "createdAt" | "updatedAt" | "revision"
        >[] = [];
        for (const card of cards.filter((item) => item.status === "active")) {
          for (const [kind, day, label] of [
            ["card_closing", card.closingDay, "Corte"],
            ["card_due", card.dueDay, "Pago"],
          ] as const) {
            const dueDate = nextCardDate(day, asOf);
            if (differenceDays(asOf, dueDate) <= 7)
              candidates.push({
                sourceKey: `${kind}:${card.id}:${dueDate}`,
                kind,
                title: `${label} próximo: ${card.name}`,
                dueDate,
                severity:
                  differenceDays(asOf, dueDate) <= 2 ? "urgent" : "warning",
                dismissed: false,
              });
          }
        }
        for (const item of obligations.filter(
          (value) => !["paid", "paused", "cancelled"].includes(value.status),
        ))
          if (differenceDays(asOf, item.nextDueDate) <= 7)
            candidates.push({
              sourceKey: `obligation:${item.id}:${item.nextDueDate}`,
              kind: "obligation_due",
              title: `Vence pronto: ${item.name}`,
              dueDate: item.nextDueDate,
              severity: item.nextDueDate < asOf ? "urgent" : "warning",
              dismissed: false,
            });
        for (const goal of goals.filter(
          (item) =>
            item.status === "active" &&
            item.targetDate &&
            item.targetDate < asOf,
        ))
          candidates.push({
            sourceKey: `goal:${goal.id}:${goal.targetDate}`,
            kind: "goal_delayed",
            title: `Meta atrasada: ${goal.name}`,
            dueDate: goal.targetDate!,
            severity: "warning",
            dismissed: false,
          });
        const saved: Reminder[] = [];
        const activeKeys = new Set(candidates.map((item) => item.sourceKey));
        for (const stale of existing) {
          if (!activeKeys.has(stale.sourceKey) && !stale.dismissed) {
            await this.db.reminders.put({
              ...stale,
              dismissed: true,
              updatedAt: now,
              revision: incrementRevision(stale.revision),
            });
          }
        }
        for (const candidate of candidates) {
          const old = byKey.get(candidate.sourceKey);
          const item: Reminder = {
            ...candidate,
            id: old?.id ?? createUuid(),
            createdAt: old?.createdAt ?? now,
            updatedAt: now,
            revision: old ? incrementRevision(old.revision) : INITIAL_REVISION,
          };
          await this.db.reminders.put(item);
          saved.push(item);
        }
        return saved;
      },
    );
  }

  async cardDebt(id: UUID) {
    const card = await this.db.creditCards.get(id);
    if (!card) throw new Error("La tarjeta no existe.");
    return calculateCardDebt(
      card,
      await this.db.installmentPurchases.where("cardId").equals(id).toArray(),
      await this.db.cardPayments.where("cardId").equals(id).toArray(),
    );
  }
}

function differenceDays(from: DomainDate, to: DomainDate): number {
  return Math.ceil(
    (new Date(`${to}T12:00:00`).getTime() -
      new Date(`${from}T12:00:00`).getTime()) /
      86_400_000,
  );
}

export const obligationService = new ObligationService(database);
import { addMonths, addWeeks, addYears, format } from "date-fns";
