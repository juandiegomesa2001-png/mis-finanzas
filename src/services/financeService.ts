import { database, type FinanceDatabase } from "../database/financeDatabase";
import {
  assertValidTransaction,
  incrementRevision,
  INITIAL_REVISION,
  type Account,
  type AccountType,
  type AppSettings,
  type Category,
  type CardPayment,
  type CardStatement,
  type CreditCard,
  type Currency,
  type DomainDate,
  type IncomeFrequency,
  type IncomeSchedule,
  type InstallmentPurchase,
  type InstallmentSchedule,
  type MoneyAmount,
  type PositiveMoneyAmount,
  type Revision,
  type Transaction,
  type TransactionCandidate,
  type UUID,
  type RecurringObligation,
  type Reminder,
  type SavingsGoal,
} from "../domain";
import { currentDomainDateTime } from "../utils/dates";
import { createUuid } from "../utils/identifiers";

const DEFAULT_CATEGORIES = [
  ["income-salary", "Salario", "income"],
  ["income-bonus", "Bonificación", "income"],
  ["income-refund", "Reembolso", "income"],
  ["income-other", "Otros ingresos", "income"],
  ["expense-food", "Alimentación", "expense"],
  ["expense-transport", "Transporte", "expense"],
  ["expense-shopping", "Compras", "expense"],
  ["expense-entertainment", "Entretenimiento", "expense"],
  ["expense-health", "Salud", "expense"],
  ["expense-home", "Hogar", "expense"],
  ["expense-education", "Educación", "expense"],
  ["expense-services", "Servicios", "expense"],
  ["expense-subscriptions", "Suscripciones", "expense"],
  ["expense-travel", "Viajes", "expense"],
  ["expense-other", "Otros gastos", "expense"],
] as const;

const DEFAULT_CATEGORY_IDS = [
  "40000000-0000-4000-8000-000000000001",
  "40000000-0000-4000-8000-000000000002",
  "40000000-0000-4000-8000-000000000003",
  "40000000-0000-4000-8000-000000000004",
  "40000000-0000-4000-8000-000000000005",
  "40000000-0000-4000-8000-000000000006",
  "40000000-0000-4000-8000-000000000007",
  "40000000-0000-4000-8000-000000000008",
  "40000000-0000-4000-8000-000000000009",
  "40000000-0000-4000-8000-000000000010",
  "40000000-0000-4000-8000-000000000011",
  "40000000-0000-4000-8000-000000000012",
  "40000000-0000-4000-8000-000000000013",
  "40000000-0000-4000-8000-000000000014",
  "40000000-0000-4000-8000-000000000015",
] as const;

export interface FinanceSnapshot {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly transactions: readonly Transaction[];
  readonly settings?: AppSettings;
  readonly incomeSchedules: readonly IncomeSchedule[];
  readonly creditCards: readonly CreditCard[];
  readonly installmentPurchases: readonly InstallmentPurchase[];
  readonly installmentSchedules: readonly InstallmentSchedule[];
  readonly cardPayments: readonly CardPayment[];
  readonly cardStatements: readonly CardStatement[];
  readonly recurringObligations: readonly RecurringObligation[];
  readonly savingsGoals: readonly SavingsGoal[];
  readonly reminders: readonly Reminder[];
}

export interface CreateAccountInput {
  readonly id?: UUID;
  readonly name: string;
  readonly institution?: string;
  readonly type: AccountType;
  readonly currency: Currency;
  readonly initialBalance: MoneyAmount;
  readonly initialDate: DomainDate;
  readonly icon?: string;
  readonly color?: string;
}

export interface UpdateAccountInput {
  readonly name?: string;
  readonly institution?: string | null;
  readonly type?: AccountType;
  readonly initialBalance?: MoneyAmount;
  readonly initialDate?: DomainDate;
  readonly icon?: string | null;
  readonly color?: string | null;
}

interface BaseMovementInput {
  readonly id?: UUID;
  readonly amount: PositiveMoneyAmount;
  readonly currency: Currency;
  readonly effectiveDate: DomainDate;
  readonly description?: string;
}

export interface IncomeInput extends BaseMovementInput {
  readonly destinationAccountId: UUID;
  readonly categoryId: UUID;
}

export interface ExpenseInput extends BaseMovementInput {
  readonly sourceAccountId: UUID;
  readonly categoryId: UUID;
}

export interface TransferInput extends BaseMovementInput {
  readonly sourceAccountId: UUID;
  readonly destinationAccountId: UUID;
}

export interface OnboardingInput {
  readonly currency: Currency;
  readonly account?: Omit<CreateAccountInput, "currency">;
  readonly income?: {
    readonly name: string;
    readonly amount: PositiveMoneyAmount;
    readonly frequency: IncomeFrequency;
    readonly nextEstimatedDate: DomainDate;
  };
}

export interface TransactionDetailsUpdate {
  readonly description?: string | null;
  readonly categoryId?: UUID;
}

function cleanRequiredText(value: string, field: string): string {
  const cleaned = value.trim();

  if (!cleaned) {
    throw new Error(`${field} es obligatorio.`);
  }

  return cleaned;
}

function cleanOptionalText(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned : undefined;
}

function assertExpectedRevision(current: Revision, expected: Revision): void {
  if (current !== expected) {
    throw new Error(
      "El registro cambió desde que se abrió. Recarga los datos antes de continuar.",
    );
  }
}

function referencesAccount(transaction: Transaction, accountId: UUID): boolean {
  if (transaction.type === "income") {
    return transaction.destinationAccountId === accountId;
  }

  if (transaction.type === "expense") {
    return transaction.sourceAccountId === accountId;
  }

  if (transaction.type === "transfer") {
    return (
      transaction.sourceAccountId === accountId ||
      transaction.destinationAccountId === accountId
    );
  }

  return transaction.accountId === accountId;
}

export class FinanceService {
  private readonly db: FinanceDatabase;

  constructor(db: FinanceDatabase) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    const now = currentDomainDateTime();

    await this.db.transaction("rw", this.db.categories, async () => {
      for (const [
        index,
        [systemKey, name, kind],
      ] of DEFAULT_CATEGORIES.entries()) {
        const existing = await this.db.categories
          .where("systemKey")
          .equals(systemKey)
          .first();

        if (existing) {
          continue;
        }

        const category: Category = {
          id: DEFAULT_CATEGORY_IDS[index] as UUID,
          systemKey,
          name,
          kind,
          status: "active",
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };

        await this.db.categories.add(category);
      }
    });
  }

  async getSnapshot(): Promise<FinanceSnapshot> {
    const [
      accounts,
      categories,
      transactions,
      settings,
      incomeSchedules,
      creditCards,
      installmentPurchases,
      installmentSchedules,
      cardPayments,
      cardStatements,
      recurringObligations,
      savingsGoals,
      reminders,
    ] = await Promise.all([
      this.db.accounts.toArray().then((items) => items.sort((a, b) => a.name.localeCompare(b.name, "es"))),
      this.db.categories.orderBy("name").toArray(),
      this.db.transactions.reverse().sortBy("effectiveDate"),
      this.db.settings.where("key").equals("primary").first(),
      this.db.incomeSchedules.orderBy("nextEstimatedDate").toArray(),
      this.db.creditCards.toArray().then((items) => items.sort((a, b) => a.name.localeCompare(b.name, "es"))),
      this.db.installmentPurchases.reverse().sortBy("purchaseDate"),
      this.db.installmentSchedules.orderBy("dueDate").toArray(),
      this.db.cardPayments.reverse().sortBy("effectiveDate"),
      this.db.cardStatements.reverse().sortBy("periodEnd"),
      this.db.recurringObligations.orderBy("nextDueDate").toArray(),
      this.db.savingsGoals.orderBy("priority").toArray(),
      this.db.reminders.orderBy("dueDate").toArray(),
    ]);

    return {
      accounts,
      categories,
      transactions,
      ...(settings ? { settings } : {}),
      incomeSchedules,
      creditCards,
      installmentPurchases,
      installmentSchedules,
      cardPayments,
      cardStatements,
      recurringObligations,
      savingsGoals,
      reminders,
    };
  }

  async createAccount(input: CreateAccountInput): Promise<Account> {
    const now = currentDomainDateTime();
    const institution = cleanOptionalText(input.institution);
    const icon = cleanOptionalText(input.icon);
    const color = cleanOptionalText(input.color);
    const account: Account = {
      id: input.id ?? createUuid(),
      name: cleanRequiredText(input.name, "El nombre de la cuenta"),
      type: input.type,
      currency: input.currency,
      initialBalance: input.initialBalance,
      initialDate: input.initialDate,
      status: "active",
      createdAt: now,
      updatedAt: now,
      revision: INITIAL_REVISION,
      ...(institution ? { institution } : {}),
      ...(icon ? { icon } : {}),
      ...(color ? { color } : {}),
    };

    await this.db.accounts.add(account);
    return account;
  }

  async updateAccount(
    id: UUID,
    expectedRevision: Revision,
    input: UpdateAccountInput,
  ): Promise<Account> {
    return this.db.transaction(
      "rw",
      this.db.accounts,
      this.db.transactions,
      async () => {
        const current = await this.db.accounts.get(id);

        if (!current) {
          throw new Error("La cuenta no existe.");
        }

        assertExpectedRevision(current.revision, expectedRevision);

        const changesOpeningData =
          (input.initialBalance !== undefined &&
            input.initialBalance !== current.initialBalance) ||
          (input.initialDate !== undefined &&
            input.initialDate !== current.initialDate);

        if (changesOpeningData) {
          const hasConfirmedMovements = await this.db.transactions
            .filter(
              (transaction) =>
                transaction.status === "confirmed" &&
                referencesAccount(transaction, id),
            )
            .count();

          if (hasConfirmedMovements > 0) {
            throw new Error(
              "No se puede cambiar el saldo o la fecha inicial de una cuenta con movimientos confirmados.",
            );
          }
        }

        const {
          institution: currentInstitution,
          icon: currentIcon,
          color: currentColor,
          ...requiredCurrent
        } = current;
        const institution =
          input.institution === null
            ? undefined
            : input.institution !== undefined
              ? cleanOptionalText(input.institution)
              : currentInstitution;
        const icon =
          input.icon === null
            ? undefined
            : input.icon !== undefined
              ? cleanOptionalText(input.icon)
              : currentIcon;
        const color =
          input.color === null
            ? undefined
            : input.color !== undefined
              ? cleanOptionalText(input.color)
              : currentColor;
        const next: Account = {
          ...requiredCurrent,
          ...(input.name !== undefined
            ? { name: cleanRequiredText(input.name, "El nombre de la cuenta") }
            : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.initialBalance !== undefined
            ? { initialBalance: input.initialBalance }
            : {}),
          ...(input.initialDate !== undefined
            ? { initialDate: input.initialDate }
            : {}),
          ...(institution ? { institution } : {}),
          ...(icon ? { icon } : {}),
          ...(color ? { color } : {}),
          updatedAt: currentDomainDateTime(),
          revision: incrementRevision(current.revision),
        };

        await this.db.accounts.put(next);
        return next;
      },
    );
  }

  async archiveAccount(id: UUID, expectedRevision: Revision): Promise<Account> {
    return this.db.transaction("rw", this.db.accounts, async () => {
      const current = await this.db.accounts.get(id);

      if (!current) {
        throw new Error("La cuenta no existe.");
      }

      assertExpectedRevision(current.revision, expectedRevision);

      const next: Account = {
        ...current,
        status: "archived",
        updatedAt: currentDomainDateTime(),
        revision: incrementRevision(current.revision),
      };

      await this.db.accounts.put(next);
      return next;
    });
  }

  async recordIncome(input: IncomeInput): Promise<Transaction> {
    return this.persistConfirmedTransaction({
      ...input,
      type: "income",
      destinationAccountId: input.destinationAccountId,
      categoryId: input.categoryId,
    });
  }

  async recordExpense(input: ExpenseInput): Promise<Transaction> {
    return this.persistConfirmedTransaction({
      ...input,
      type: "expense",
      sourceAccountId: input.sourceAccountId,
      categoryId: input.categoryId,
    });
  }

  async recordTransfer(input: TransferInput): Promise<Transaction> {
    return this.persistConfirmedTransaction({
      ...input,
      type: "transfer",
      sourceAccountId: input.sourceAccountId,
      destinationAccountId: input.destinationAccountId,
    });
  }

  async setTheme(theme: "dark" | "light"): Promise<void> {
    await this.db.transaction("rw", this.db.settings, async () => {
      const current = await this.db.settings
        .where("key")
        .equals("primary")
        .first();
      if (!current) throw new Error("Falta la configuración principal.");
      await this.db.settings.put({
        ...current,
        theme,
        updatedAt: currentDomainDateTime(),
        revision: incrementRevision(current.revision),
      });
    });
  }

  private async persistConfirmedTransaction(
    input:
      | (BaseMovementInput & {
          readonly type: "income";
          readonly destinationAccountId: UUID;
          readonly categoryId: UUID;
        })
      | (BaseMovementInput & {
          readonly type: "expense";
          readonly sourceAccountId: UUID;
          readonly categoryId: UUID;
        })
      | (BaseMovementInput & {
          readonly type: "transfer";
          readonly sourceAccountId: UUID;
          readonly destinationAccountId: UUID;
        }),
  ): Promise<Transaction> {
    const now = currentDomainDateTime();
    const description = cleanOptionalText(input.description);
    const candidate: TransactionCandidate = {
      ...input,
      id: input.id ?? createUuid(),
      status: "confirmed",
      confirmedAt: now,
      createdAt: now,
      updatedAt: now,
      revision: INITIAL_REVISION,
      ...(description ? { description } : {}),
    };

    return this.db.transaction(
      "rw",
      this.db.accounts,
      this.db.categories,
      this.db.transactions,
      this.db.settings,
      async () => {
        if (candidate.type === "income" || candidate.type === "expense") {
          const categoryId = candidate.categoryId;
          if (!categoryId) throw new Error("La categoría es obligatoria.");
          const category = await this.db.categories.get(categoryId);

          if (!category || category.status !== "active") {
            throw new Error("La categoría seleccionada no está disponible.");
          }

          if (category.kind !== candidate.type) {
            throw new Error(
              "La categoría no corresponde al tipo de movimiento.",
            );
          }
        }

        const accounts = await this.db.accounts.toArray();
        assertValidTransaction(candidate, accounts);

        const transaction = candidate as Transaction;
        await this.db.transactions.add(transaction);

        if (transaction.type === "expense") {
          const settings = await this.db.settings
            .where("key")
            .equals("primary")
            .first();

          if (settings && transaction.sourceAccountId) {
            await this.db.settings.put({
              ...settings,
              lastExpenseAccountId: transaction.sourceAccountId,
              updatedAt: now,
              revision: incrementRevision(settings.revision),
            });
          }
        }

        return transaction;
      },
    );
  }

  async updateTransactionDetails(
    id: UUID,
    expectedRevision: Revision,
    changes: TransactionDetailsUpdate,
  ): Promise<Transaction> {
    return this.db.transaction(
      "rw",
      this.db.transactions,
      this.db.categories,
      async () => {
        const current = await this.db.transactions.get(id);

        if (!current) {
          throw new Error("El movimiento no existe.");
        }

        if (current.status === "voided") {
          throw new Error("Un movimiento anulado no se puede editar.");
        }

        assertExpectedRevision(current.revision, expectedRevision);

        if (
          changes.categoryId &&
          current.type !== "income" &&
          current.type !== "expense"
        ) {
          throw new Error("Este tipo de movimiento no utiliza categoría.");
        }

        if (changes.categoryId) {
          const category = await this.db.categories.get(changes.categoryId);

          if (!category || category.kind !== current.type) {
            throw new Error("La categoría no corresponde al movimiento.");
          }
        }

        const description =
          changes.description === null
            ? undefined
            : cleanOptionalText(changes.description);
        const next = {
          ...current,
          ...(changes.description !== undefined ? { description } : {}),
          ...(changes.categoryId ? { categoryId: changes.categoryId } : {}),
          updatedAt: currentDomainDateTime(),
          revision: incrementRevision(current.revision),
        } as Transaction;

        await this.db.transactions.put(next);
        return next;
      },
    );
  }

  async voidTransaction(
    id: UUID,
    expectedRevision: Revision,
    reason: string,
  ): Promise<Transaction> {
    return this.db.transaction(
      "rw",
      [
        this.db.transactions,
        this.db.installmentPurchases,
        this.db.cardPayments,
      ],
      async () => {
        const current = await this.db.transactions.get(id);

        if (!current) {
          throw new Error("El movimiento no existe.");
        }

        if (current.status === "voided") {
          throw new Error("El movimiento ya está anulado.");
        }

        assertExpectedRevision(current.revision, expectedRevision);
        const now = currentDomainDateTime();
        const next = {
          ...current,
          status: "voided",
          voidedAt: now,
          voidReason: cleanRequiredText(reason, "El motivo de anulación"),
          updatedAt: now,
          revision: incrementRevision(current.revision),
        } as Transaction;

        await this.db.transactions.put(next);
        const purchase = await this.db.installmentPurchases
          .where("transactionId")
          .equals(id)
          .first();
        if (purchase && purchase.status !== "voided") {
          await this.db.installmentPurchases.put({
            ...purchase,
            status: "voided",
            updatedAt: now,
            revision: incrementRevision(purchase.revision),
          });
        }
        const cardEntry = await this.db.cardPayments
          .where("transactionId")
          .equals(id)
          .first();
        if (cardEntry && cardEntry.status !== "voided") {
          await this.db.cardPayments.put({
            ...cardEntry,
            status: "voided",
            updatedAt: now,
            revision: incrementRevision(cardEntry.revision),
          });
        }
        return next;
      },
    );
  }

  async completeOnboarding(input: OnboardingInput): Promise<void> {
    const now = currentDomainDateTime();

    await this.db.transaction(
      "rw",
      this.db.settings,
      this.db.accounts,
      this.db.incomeSchedules,
      async () => {
        const currentSettings = await this.db.settings
          .where("key")
          .equals("primary")
          .first();
        const account = input.account
          ? await this.createOnboardingAccount(
              input.account,
              input.currency,
              now,
            )
          : undefined;

        const settings: AppSettings = currentSettings
          ? {
              ...currentSettings,
              currency: input.currency,
              onboardingCompleted: true,
              onboardingSkipped: false,
              updatedAt: now,
              revision: incrementRevision(currentSettings.revision),
            }
          : {
              id: createUuid(),
              key: "primary",
              currency: input.currency,
              onboardingCompleted: true,
              onboardingSkipped: false,
              createdAt: now,
              updatedAt: now,
              revision: INITIAL_REVISION,
            };

        await this.db.settings.put(settings);

        if (input.income) {
          const currentIncome = await this.db.incomeSchedules
            .where("key")
            .equals("primary-income")
            .first();
          const destinationAccountId =
            account?.id ??
            (currentIncome?.currency === input.currency
              ? currentIncome.destinationAccountId
              : undefined);
          const incomeSchedule: IncomeSchedule = {
            id: currentIncome?.id ?? createUuid(),
            key: "primary-income",
            name: cleanRequiredText(input.income.name, "El nombre del ingreso"),
            amount: input.income.amount,
            currency: input.currency,
            frequency: input.income.frequency,
            nextEstimatedDate: input.income.nextEstimatedDate,
            status: "active",
            createdAt: currentIncome?.createdAt ?? now,
            updatedAt: now,
            revision: currentIncome
              ? incrementRevision(currentIncome.revision)
              : INITIAL_REVISION,
            ...(destinationAccountId ? { destinationAccountId } : {}),
          };

          await this.db.incomeSchedules.put(incomeSchedule);
        }
      },
    );
  }

  private async createOnboardingAccount(
    input: Omit<CreateAccountInput, "currency">,
    currency: Currency,
    now: ReturnType<typeof currentDomainDateTime>,
  ): Promise<Account> {
    const institution = cleanOptionalText(input.institution);
    const account: Account = {
      id: input.id ?? createUuid(),
      name: cleanRequiredText(input.name, "El nombre de la cuenta"),
      type: input.type,
      currency,
      initialBalance: input.initialBalance,
      initialDate: input.initialDate,
      status: "active",
      createdAt: now,
      updatedAt: now,
      revision: INITIAL_REVISION,
      ...(institution ? { institution } : {}),
    };

    await this.db.accounts.add(account);
    return account;
  }

  async skipOnboarding(currency: Currency): Promise<void> {
    const now = currentDomainDateTime();
    const current = await this.db.settings
      .where("key")
      .equals("primary")
      .first();
    const settings: AppSettings = current
      ? {
          ...current,
          currency,
          onboardingSkipped: true,
          updatedAt: now,
          revision: incrementRevision(current.revision),
        }
      : {
          id: createUuid(),
          key: "primary",
          currency,
          onboardingCompleted: false,
          onboardingSkipped: true,
          createdAt: now,
          updatedAt: now,
          revision: INITIAL_REVISION,
        };

    await this.db.settings.put(settings);
  }
}

export function isDuplicateKeyError(error: unknown): boolean {
  return error instanceof Error && error.name === "ConstraintError";
}

export const financeService = new FinanceService(database);
