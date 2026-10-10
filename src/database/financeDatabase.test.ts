import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { FinanceDatabase } from './financeDatabase'
import {
  calculateAccountBalance,
  toCurrency,
  toDomainDate,
  toMoneyAmount,
  toPositiveMoneyAmount,
  toUuid,
  type Account,
  type Category,
} from '../domain'
import {
  FinanceService,
  isDuplicateKeyError,
} from '../services/financeService'

const COP = toCurrency('COP')
const USD = toCurrency('USD')
const ACCOUNT_A = toUuid('50000000-0000-4000-8000-000000000001')
const ACCOUNT_B = toUuid('50000000-0000-4000-8000-000000000002')
const TRANSACTION_ID = toUuid('60000000-0000-4000-8000-000000000001')
const DATE = toDomainDate('2026-08-01')

describe('persistencia financiera con Dexie', () => {
  let db: FinanceDatabase
  let service: FinanceService

  beforeEach(async () => {
    db = new FinanceDatabase(`mis-finanzas-test-${crypto.randomUUID()}`)
    service = new FinanceService(db)
    await service.initialize()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  async function createAccount(
    id = ACCOUNT_A,
    currency = COP,
    initialBalance = 100_000,
  ): Promise<Account> {
    return service.createAccount({
      id,
      name: id === ACCOUNT_A ? 'Cuenta A' : 'Cuenta B',
      type: 'savings',
      currency,
      initialBalance: toMoneyAmount(initialBalance),
      initialDate: DATE,
    })
  }

  async function category(kind: Category['kind']): Promise<Category> {
    const found = await db.categories.where('kind').equals(kind).first()
    if (!found) throw new Error(`Falta categoría ${kind}`)
    return found
  }

  it('crea únicamente las tablas versionadas aprobadas', () => {
    expect(db.tables.map(({ name }) => name).sort()).toEqual([
      'accounts',
      'cardPayments',
      'cardStatements',
      'categories',
      'creditCards',
      'incomeSchedules',
      'installmentPurchases',
      'installmentSchedules',
      'recurringObligations',
      'reminders',
      'savingsGoals',
      'settings',
      'transactions',
    ])
    expect(db.tables.some(({ name }) => name === 'transfers')).toBe(false)
  })

  it('persiste una cuenta después de cerrar y reabrir IndexedDB', async () => {
    const created = await createAccount()
    const name = db.name
    db.close()
    db = new FinanceDatabase(name)

    expect(await db.accounts.get(created.id)).toEqual(created)
  })

  it('actualiza una cuenta e incrementa revision', async () => {
    const created = await createAccount()
    const updated = await service.updateAccount(created.id, created.revision, {
      name: 'Cuenta principal',
    })

    expect(updated.name).toBe('Cuenta principal')
    expect(updated.revision).toBe(2)
    await expect(
      service.updateAccount(created.id, created.revision, { name: 'Obsoleta' }),
    ).rejects.toThrow('cambió')
  })

  it('archiva sin eliminar la cuenta', async () => {
    const created = await createAccount()
    const archived = await service.archiveAccount(created.id, created.revision)

    expect(archived.status).toBe('archived')
    expect(archived.revision).toBe(2)
    expect(await db.accounts.get(created.id)).toBeDefined()
  })

  it('impide UUID duplicados en cuentas', async () => {
    await createAccount()

    await expect(createAccount()).rejects.toSatisfy(isDuplicateKeyError)
    expect(await db.accounts.count()).toBe(1)
  })

  it('guarda onboarding, cuenta e ingreso programado de forma compuesta', async () => {
    await service.completeOnboarding({
      currency: COP,
      account: {
        id: ACCOUNT_A,
        name: 'Cuenta de nómina',
        type: 'savings',
        initialBalance: toMoneyAmount(25_000),
        initialDate: DATE,
      },
      income: {
        name: 'Salario',
        amount: toPositiveMoneyAmount(300_000),
        frequency: 'monthly',
        nextEstimatedDate: DATE,
      },
    })

    expect(await db.settings.count()).toBe(1)
    expect(await db.accounts.count()).toBe(1)
    const schedule = await db.incomeSchedules.toCollection().first()
    expect(schedule?.destinationAccountId).toBe(ACCOUNT_A)
    expect(await db.transactions.count()).toBe(0)
  })

  it('actualiza el ingreso principal sin duplicarlo al repetir onboarding', async () => {
    const firstInput = {
      currency: COP,
      income: {
        name: 'Salario',
        amount: toPositiveMoneyAmount(300_000),
        frequency: 'monthly' as const,
        nextEstimatedDate: DATE,
      },
    }
    await service.completeOnboarding(firstInput)
    await service.completeOnboarding({
      ...firstInput,
      income: {
        ...firstInput.income,
        amount: toPositiveMoneyAmount(350_000),
      },
    })

    const schedules = await db.incomeSchedules.toArray()
    expect(schedules).toHaveLength(1)
    expect(schedules[0]?.amount).toBe(350_000)
    expect(schedules[0]?.revision).toBe(2)
  })

  it('revierte todo el onboarding si falla una escritura compuesta', async () => {
    await createAccount()

    await expect(
      service.completeOnboarding({
        currency: COP,
        account: {
          id: ACCOUNT_A,
          name: 'Duplicada',
          type: 'savings',
          initialBalance: toMoneyAmount(0),
          initialDate: DATE,
        },
        income: {
          name: 'Salario',
          amount: toPositiveMoneyAmount(100_000),
          frequency: 'monthly',
          nextEstimatedDate: DATE,
        },
      }),
    ).rejects.toBeDefined()

    expect(await db.settings.count()).toBe(0)
    expect(await db.incomeSchedules.count()).toBe(0)
  })

  it('persiste ingresos y gastos y deriva el saldo desde IndexedDB', async () => {
    const account = await createAccount()
    const incomeCategory = await category('income')
    const expenseCategory = await category('expense')
    await service.recordIncome({
      amount: toPositiveMoneyAmount(50_000),
      currency: COP,
      effectiveDate: DATE,
      destinationAccountId: account.id,
      categoryId: incomeCategory.id,
    })
    await service.recordExpense({
      amount: toPositiveMoneyAmount(20_000),
      currency: COP,
      effectiveDate: DATE,
      sourceAccountId: account.id,
      categoryId: expenseCategory.id,
    })

    const persisted = await db.transactions.toArray()
    expect(persisted).toHaveLength(2)
    expect(calculateAccountBalance(account, persisted)).toBe(130_000)
  })

  it('guarda una transferencia como un único movimiento y afecta ambos saldos', async () => {
    const source = await createAccount()
    const destination = await createAccount(ACCOUNT_B, COP, 10_000)
    const transfer = await service.recordTransfer({
      amount: toPositiveMoneyAmount(30_000),
      currency: COP,
      effectiveDate: DATE,
      sourceAccountId: source.id,
      destinationAccountId: destination.id,
    })
    const persisted = await db.transactions.toArray()

    expect(transfer.type).toBe('transfer')
    expect(persisted).toHaveLength(1)
    expect(calculateAccountBalance(source, persisted)).toBe(70_000)
    expect(calculateAccountBalance(destination, persisted)).toBe(40_000)
  })

  it('revierte una transferencia inválida sin dejar registros parciales', async () => {
    const source = await createAccount()
    const destination = await createAccount(ACCOUNT_B, USD)

    await expect(
      service.recordTransfer({
        amount: toPositiveMoneyAmount(30_000),
        currency: COP,
        effectiveDate: DATE,
        sourceAccountId: source.id,
        destinationAccountId: destination.id,
      }),
    ).rejects.toThrow('moneda')

    expect(await db.transactions.count()).toBe(0)
  })

  it('previene movimientos duplicados por UUID', async () => {
    const account = await createAccount()
    const incomeCategory = await category('income')
    const input = {
      id: TRANSACTION_ID,
      amount: toPositiveMoneyAmount(50_000),
      currency: COP,
      effectiveDate: DATE,
      destinationAccountId: account.id,
      categoryId: incomeCategory.id,
    }

    await service.recordIncome(input)
    await expect(service.recordIncome(input)).rejects.toSatisfy(
      isDuplicateKeyError,
    )
    expect(await db.transactions.count()).toBe(1)
  })

  it('anula sin eliminar y revierte el efecto sobre el saldo', async () => {
    const account = await createAccount()
    const expenseCategory = await category('expense')
    const expense = await service.recordExpense({
      amount: toPositiveMoneyAmount(20_000),
      currency: COP,
      effectiveDate: DATE,
      sourceAccountId: account.id,
      categoryId: expenseCategory.id,
    })
    expect(
      calculateAccountBalance(account, await db.transactions.toArray()),
    ).toBe(80_000)

    const voided = await service.voidTransaction(
      expense.id,
      expense.revision,
      'Registro equivocado',
    )

    expect(voided.status).toBe('voided')
    expect(voided.revision).toBe(2)
    expect(await db.transactions.count()).toBe(1)
    expect(
      calculateAccountBalance(account, await db.transactions.toArray()),
    ).toBe(100_000)
  })

  it('edita solo detalles controlados e incrementa revision', async () => {
    const account = await createAccount()
    const categoryRecord = await category('income')
    const income = await service.recordIncome({
      amount: toPositiveMoneyAmount(50_000),
      currency: COP,
      effectiveDate: DATE,
      destinationAccountId: account.id,
      categoryId: categoryRecord.id,
    })
    const updated = await service.updateTransactionDetails(
      income.id,
      income.revision,
      { description: 'Pago recibido' },
    )

    expect(updated.description).toBe('Pago recibido')
    expect(updated.amount).toBe(income.amount)
    expect(updated.revision).toBe(2)
  })

  it('guarda la última cuenta de gasto dentro de la misma operación', async () => {
    await service.skipOnboarding(COP)
    const account = await createAccount()
    const expenseCategory = await category('expense')
    const before = await db.settings.where('key').equals('primary').first()
    await service.recordExpense({
      amount: toPositiveMoneyAmount(10_000),
      currency: COP,
      effectiveDate: DATE,
      sourceAccountId: account.id,
      categoryId: expenseCategory.id,
    })
    const after = await db.settings.where('key').equals('primary').first()

    expect(after?.lastExpenseAccountId).toBe(account.id)
    expect(after?.revision).toBe((before?.revision ?? 0) + 1)
  })

  it('protege saldo y fecha inicial cuando existen movimientos confirmados', async () => {
    const account = await createAccount()
    const incomeCategory = await category('income')
    await service.recordIncome({
      amount: toPositiveMoneyAmount(1_000),
      currency: COP,
      effectiveDate: DATE,
      destinationAccountId: account.id,
      categoryId: incomeCategory.id,
    })

    await expect(
      service.updateAccount(account.id, account.revision, {
        initialBalance: toMoneyAmount(0),
      }),
    ).rejects.toThrow('movimientos confirmados')
  })
})

