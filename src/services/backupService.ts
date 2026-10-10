import { z } from "zod";

import {
  DATABASE_SCHEMA_VERSION,
  database,
  type FinanceDatabase,
} from "../database/financeDatabase";
import {
  toDomainDate,
  toDomainDateTime,
  validateTransaction,
  type Account,
  type AppSettings,
  type CardPayment,
  type CardStatement,
  type Category,
  type CreditCard,
  type IncomeSchedule,
  type InstallmentPurchase,
  type InstallmentSchedule,
  type RecurringObligation,
  type Reminder,
  type SavingsGoal,
  type Transaction,
  type TransactionCandidate,
} from "../domain";

export const BACKUP_FORMAT = "mis-finanzas-backup";
export const BACKUP_FORMAT_VERSION = 3;

export interface BackupData {
  readonly accounts: readonly Account[];
  readonly categories: readonly Category[];
  readonly transactions: readonly Transaction[];
  readonly settings: readonly AppSettings[];
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
export interface FinanceBackup {
  readonly format: typeof BACKUP_FORMAT;
  readonly version: 1 | 2 | 3;
  readonly databaseSchemaVersion: number;
  readonly exportedAt: string;
  readonly data: BackupData;
}
export interface RestoreAnalysis {
  readonly backup: FinanceBackup;
  readonly newRecords: number;
  readonly identicalRecords: number;
  readonly conflicts: readonly { table: keyof BackupData; id: string }[];
}

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timestamp = z.iso.datetime({ offset: false });
const integer = z.number().refine(Number.isSafeInteger);
const positive = integer.refine((value) => value > 0);
const money = integer;
const revision = integer.refine((value) => value >= 1);
const currency = z.string().regex(/^[A-Z]{3}$/);
const metadata = { createdAt: timestamp, updatedAt: timestamp, revision };
const account = z.object({
  id: uuid,
  name: z.string().min(1),
  institution: z.string().optional(),
  type: z.enum([
    "savings",
    "checking",
    "cash",
    "digital_wallet",
    "savings_reserve",
    "other",
  ]),
  currency,
  initialBalance: money,
  initialDate: date,
  status: z.enum(["active", "archived"]),
  icon: z.string().optional(),
  color: z.string().optional(),
  ...metadata,
});
const category = z.object({
  id: uuid,
  name: z.string().min(1),
  kind: z.enum(["income", "expense"]),
  status: z.enum(["active", "archived"]),
  systemKey: z.string().optional(),
  ...metadata,
});
const transaction = z.object({
  id: uuid,
  type: z.enum(["income", "expense", "transfer", "adjustment"]),
  status: z.enum(["pending", "confirmed", "voided"]),
  amount: positive,
  currency,
  effectiveDate: date,
  description: z.string().optional(),
  categoryId: uuid.optional(),
  sourceAccountId: uuid.optional(),
  destinationAccountId: uuid.optional(),
  accountId: uuid.optional(),
  creditCardId: uuid.optional(),
  relatedEntityId: uuid.optional(),
  adjustmentDirection: z.enum(["inflow", "outflow"]).optional(),
  confirmedAt: timestamp.optional(),
  voidedAt: timestamp.optional(),
  voidReason: z.string().optional(),
  ...metadata,
});
const settings = z.object({
  id: uuid,
  key: z.literal("primary"),
  currency,
  onboardingCompleted: z.boolean(),
  onboardingSkipped: z.boolean(),
  lastExpenseAccountId: uuid.optional(),
  theme: z.enum(["dark", "light"]).optional(),
  ...metadata,
});
const income = z.object({
  id: uuid,
  key: z.literal("primary-income").optional(),
  name: z.string().min(1),
  amount: positive,
  currency,
  frequency: z.enum(["weekly", "biweekly", "monthly", "variable"]),
  nextEstimatedDate: date,
  destinationAccountId: uuid.optional(),
  status: z.enum(["active", "paused"]),
  ...metadata,
});
const card = z.object({
  id: uuid,
  bank: z.string().min(1),
  name: z.string().min(1),
  brand: z.enum(["visa", "mastercard", "amex", "other"]),
  lastFour: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  currency,
  creditLimit: positive,
  openingDebt: money,
  statementBalance: money,
  unbilledBalance: money,
  annualEffectiveRateBps: integer.optional(),
  closingDay: integer,
  dueDay: integer,
  minimumPayment: money,
  totalPayment: money,
  usualPaymentAccountId: uuid.optional(),
  status: z.enum(["active", "archived"]),
  ...metadata,
});
const purchase = z.object({
  id: uuid,
  cardId: uuid,
  transactionId: uuid,
  description: z.string().min(1),
  purchaseDate: date,
  amount: positive,
  currency,
  installmentCount: integer,
  annualEffectiveRateBps: integer.optional(),
  financeCharges: money,
  paidInstallments: integer,
  status: z.enum(["active", "paid", "voided"]),
  ...metadata,
});
const installment = z.object({
  id: uuid,
  purchaseId: uuid,
  installmentNumber: integer,
  dueDate: date,
  principal: money,
  interest: money,
  status: z.enum(["pending", "paid"]),
  ...metadata,
});
const payment = z.object({
  id: uuid,
  cardId: uuid,
  type: z.enum([
    "minimum_payment",
    "total_payment",
    "extra_payment",
    "refund",
    "adjustment_increase",
    "adjustment_decrease",
    "interest",
    "fee",
  ]),
  amount: positive,
  currency,
  effectiveDate: date,
  paymentAccountId: uuid.optional(),
  transactionId: uuid.optional(),
  description: z.string().optional(),
  status: z.enum(["confirmed", "voided"]),
  ...metadata,
});
const cardStatement = z.object({
  id: uuid,
  cardId: uuid,
  periodEnd: date,
  dueDate: date,
  statementBalance: money,
  unbilledBalance: money,
  minimumPayment: money,
  totalPayment: money,
  status: z.enum(["open", "paid", "reconciled"]),
  ...metadata,
});
const obligation = z.object({
  id: uuid,
  name: z.string().min(1),
  kind: z.enum(["fixed_expense", "utility", "subscription"]),
  categoryId: uuid,
  currency,
  expectedAmount: positive,
  billedAmount: positive.optional(),
  frequency: z.enum(["weekly", "monthly", "quarterly", "yearly", "variable"]),
  nextDueDate: date,
  paymentAccountId: uuid.optional(),
  status: z.enum(["planned", "billed", "paid", "paused", "cancelled"]),
  lastPaymentTransactionId: uuid.optional(),
  ...metadata,
});
const goal = z.object({
  id: uuid,
  name: z.string().min(1),
  currency,
  targetAmount: positive,
  currentAmount: money,
  targetDate: date.optional(),
  priority: z.enum(["low", "medium", "high"]),
  plannedMonthlyContribution: money,
  mode: z.enum(["flexible", "balanced", "accelerated"]),
  status: z.enum(["active", "completed", "paused"]),
  ...metadata,
});
const reminder = z.object({
  id: uuid,
  sourceKey: z.string().min(1),
  kind: z.enum(["card_closing", "card_due", "obligation_due", "goal_delayed"]),
  title: z.string().min(1),
  dueDate: date,
  severity: z.enum(["info", "warning", "urgent"]),
  dismissed: z.boolean(),
  ...metadata,
});
const oldData = z.object({
  accounts: z.array(account),
  categories: z.array(category),
  transactions: z.array(transaction),
  settings: z.array(settings).max(1),
  incomeSchedules: z.array(income),
});
const versionTwoData = oldData.extend({
  creditCards: z.array(card),
  installmentPurchases: z.array(purchase),
  installmentSchedules: z.array(installment),
  cardPayments: z.array(payment),
  recurringObligations: z.array(obligation),
  savingsGoals: z.array(goal),
  reminders: z.array(reminder),
});
const currentData = versionTwoData.extend({
  cardStatements: z.array(cardStatement),
});
const envelope = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  databaseSchemaVersion: integer,
  exportedAt: timestamp,
  data: z.unknown(),
});
const EMPTY_NEW_DATA = {
  creditCards: [],
  installmentPurchases: [],
  installmentSchedules: [],
  cardPayments: [],
  recurringObligations: [],
  savingsGoals: [],
  reminders: [],
  cardStatements: [],
} as const;

function ensureUnique(data: BackupData): void {
  for (const [name, values] of Object.entries(data)) {
    const records = values as readonly { readonly id: string }[];
    const ids = records.map(({ id }) => id);
    if (new Set(ids).size !== ids.length)
      throw new Error(`El respaldo contiene UUID duplicados en ${name}.`);
  }
}

export function validateBackupPayload(payload: unknown): FinanceBackup {
  const header = envelope.parse(payload);
  if (
    header.version === BACKUP_FORMAT_VERSION &&
    header.databaseSchemaVersion > DATABASE_SCHEMA_VERSION
  )
    throw new Error(
      "El respaldo requiere una versión más reciente de la aplicación.",
    );
  const parsed =
    header.version === 1
      ? oldData.parse(header.data)
      : header.version === 2
        ? versionTwoData.parse(header.data)
        : currentData.parse(header.data);
  const data = (header.version === 1
    ? { ...parsed, ...EMPTY_NEW_DATA }
    : header.version === 2
      ? { ...parsed, cardStatements: [] }
      : parsed) as unknown as BackupData;
  const backup: FinanceBackup = {
    format: BACKUP_FORMAT,
    version: header.version,
    databaseSchemaVersion: header.databaseSchemaVersion,
    exportedAt: header.exportedAt,
    data,
  };
  ensureUnique(data);
  const accountIds = new Set(data.accounts.map((item) => item.id));
  const cardIds = new Set(data.creditCards.map((item) => item.id));
  const categoryById = new Map(data.categories.map((item) => [item.id, item]));
  for (const item of data.transactions) {
    toDomainDate(item.effectiveDate);
    toDomainDateTime(item.createdAt);
    toDomainDateTime(item.updatedAt);
    const issues = validateTransaction(
      item as TransactionCandidate,
      data.accounts,
    );
    if (issues.length)
      throw new Error(
        `Movimiento inválido: ${issues.map((issue) => issue.message).join(" ")}`,
      );
    if (
      "creditCardId" in item &&
      item.creditCardId &&
      !cardIds.has(item.creditCardId)
    )
      throw new Error("Un movimiento referencia una tarjeta inexistente.");
    if (
      item.categoryId &&
      categoryById.get(item.categoryId)?.kind !== item.type
    )
      throw new Error("Un movimiento referencia una categoría incompatible.");
  }
  for (const item of data.installmentPurchases)
    if (
      !cardIds.has(item.cardId) ||
      !data.transactions.some((tx) => tx.id === item.transactionId)
    )
      throw new Error("Una compra a cuotas tiene referencias inválidas.");
  for (const item of data.installmentSchedules)
    if (
      !data.installmentPurchases.some(
        (purchaseItem) => purchaseItem.id === item.purchaseId,
      )
    )
      throw new Error("Una cuota referencia una compra inexistente.");
  for (const item of data.cardPayments)
    if (
      !cardIds.has(item.cardId) ||
      (item.paymentAccountId && !accountIds.has(item.paymentAccountId))
    )
      throw new Error("Un pago de tarjeta tiene referencias inválidas.");
  for (const item of data.cardStatements)
    if (!cardIds.has(item.cardId))
      throw new Error("Un extracto referencia una tarjeta inexistente.");
  return backup;
}

const tableNames = [
  "accounts",
  "categories",
  "transactions",
  "settings",
  "incomeSchedules",
  "creditCards",
  "installmentPurchases",
  "installmentSchedules",
  "cardPayments",
  "cardStatements",
  "recurringObligations",
  "savingsGoals",
  "reminders",
] as const;

export class BackupService {
  private readonly db: FinanceDatabase;
  constructor(db: FinanceDatabase) {
    this.db = db;
  }
  async createBackup(): Promise<FinanceBackup> {
    const data = {} as Record<keyof BackupData, unknown>;
    await this.db.transaction("r", this.db.tables, async () => {
      for (const name of tableNames)
        data[name] = await this.db.table(name).toArray();
    });
    return validateBackupPayload({
      format: BACKUP_FORMAT,
      version: BACKUP_FORMAT_VERSION,
      databaseSchemaVersion: DATABASE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    });
  }
  async analyzeRestore(payload: unknown): Promise<RestoreAnalysis> {
    const backup = validateBackupPayload(payload);
    let newRecords = 0;
    let identicalRecords = 0;
    const conflicts: { table: keyof BackupData; id: string }[] = [];
    for (const name of tableNames)
      for (const record of backup.data[name]) {
        const local = await this.db.table(name).get(record.id);
        if (!local) newRecords += 1;
        else if (JSON.stringify(local) === JSON.stringify(record))
          identicalRecords += 1;
        else conflicts.push({ table: name, id: record.id });
      }
    return { backup, newRecords, identicalRecords, conflicts };
  }
  async restore(
    payload: unknown,
    conflictPolicy: "keep-local" | "replace-local" | "replace-all" = "keep-local",
  ): Promise<RestoreAnalysis> {
    const analysis = await this.analyzeRestore(payload);
    await this.db.transaction("rw", this.db.tables, async () => {
      if (conflictPolicy === "replace-all") {
        for (const name of tableNames) {
          const table = this.db.table(name);
          await table.clear();
          const records = analysis.backup.data[name];
          if (records.length > 0) await table.bulkAdd([...records]);
        }
        return;
      }

      for (const name of tableNames)
        for (const record of analysis.backup.data[name]) {
          const table = this.db.table(name);
          const current = await table.get(record.id);
          if (!current) await table.add(record);
          else if (
            JSON.stringify(current) !== JSON.stringify(record) &&
            conflictPolicy === "replace-local"
          )
            await table.put(record);
        }
    });
    return analysis;
  }
}

export const backupService = new BackupService(database);
