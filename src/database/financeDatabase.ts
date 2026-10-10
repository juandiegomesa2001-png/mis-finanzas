import Dexie, { type Table } from 'dexie'

import type { Account, AppSettings, CardPayment, CardStatement, Category, CreditCard, IncomeSchedule, InstallmentPurchase, InstallmentSchedule, RecurringObligation, Reminder, SavingsGoal, Transaction, UUID } from '../domain'

export const DATABASE_NAME = 'mis-finanzas'
export const DATABASE_SCHEMA_VERSION = 3

const V1_STORES = {
  accounts: '&id,status,type,currency,initialDate,updatedAt',
  categories: '&id,&systemKey,[kind+status],name,updatedAt',
  transactions: '&id,type,status,effectiveDate,currency,sourceAccountId,destinationAccountId,accountId,categoryId,[type+status+effectiveDate],[sourceAccountId+status+effectiveDate],[destinationAccountId+status+effectiveDate],updatedAt',
  settings: '&id,&key,updatedAt',
  incomeSchedules: '&id,&key,status,nextEstimatedDate,destinationAccountId,updatedAt',
} as const

const V2_STORES = {
  accounts: '&id,status,type,currency,initialDate,updatedAt',
  categories: '&id,&systemKey,[kind+status],name,updatedAt',
  transactions: '&id,type,status,effectiveDate,currency,sourceAccountId,destinationAccountId,accountId,creditCardId,relatedEntityId,[type+status+effectiveDate],updatedAt',
  settings: '&id,&key,updatedAt',
  incomeSchedules: '&id,&key,status,nextEstimatedDate,destinationAccountId,updatedAt',
  creditCards: '&id,status,currency,dueDay,closingDay,updatedAt',
  installmentPurchases: '&id,&transactionId,cardId,purchaseDate,status,updatedAt',
  installmentSchedules: '&id,[purchaseId+installmentNumber],purchaseId,dueDate,status,updatedAt',
  cardPayments: '&id,&transactionId,cardId,effectiveDate,type,status,updatedAt',
  recurringObligations: '&id,kind,status,nextDueDate,currency,updatedAt',
  savingsGoals: '&id,status,currency,targetDate,priority,updatedAt',
  reminders: '&id,&sourceKey,kind,dueDate,severity,dismissed,updatedAt',
} as const

export class FinanceDatabase extends Dexie {
  accounts!: Table<Account, UUID>
  categories!: Table<Category, UUID>
  transactions!: Table<Transaction, UUID>
  settings!: Table<AppSettings, UUID>
  incomeSchedules!: Table<IncomeSchedule, UUID>
  creditCards!: Table<CreditCard, UUID>
  installmentPurchases!: Table<InstallmentPurchase, UUID>
  installmentSchedules!: Table<InstallmentSchedule, UUID>
  cardPayments!: Table<CardPayment, UUID>
  cardStatements!: Table<CardStatement, UUID>
  recurringObligations!: Table<RecurringObligation, UUID>
  savingsGoals!: Table<SavingsGoal, UUID>
  reminders!: Table<Reminder, UUID>

  constructor(name = DATABASE_NAME) {
    super(name)
    this.version(1).stores(V1_STORES)
    this.version(2).stores(V2_STORES)
    this.version(DATABASE_SCHEMA_VERSION).stores({
      ...V2_STORES,
      cardStatements: '&id,[cardId+periodEnd],cardId,dueDate,status,updatedAt',
    })
  }
}

export const database = new FinanceDatabase()
