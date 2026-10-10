import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DATABASE_SCHEMA_VERSION, FinanceDatabase } from '../database/financeDatabase'
import {
  toCurrency,
  toDomainDate,
  toMoneyAmount,
  toPositiveMoneyAmount,
  toUuid,
} from '../domain'
import { BACKUP_FORMAT_VERSION, BackupService, validateBackupPayload } from './backupService'
import { FinanceService } from './financeService'

describe('respaldo JSON', () => {
  let db: FinanceDatabase
  let finance: FinanceService

  beforeEach(async () => {
    db = new FinanceDatabase(`backup-test-${crypto.randomUUID()}`)
    finance = new FinanceService(db)
    await finance.initialize()
  })

  afterEach(async () => {
    db.close()
    await db.delete()
  })

  it('exporta una instantánea versionada y validada', async () => {
    const account = await finance.createAccount({
      id: toUuid('70000000-0000-4000-8000-000000000001'),
      name: 'Cuenta principal',
      type: 'savings',
      currency: toCurrency('COP'),
      initialBalance: toMoneyAmount(100_000),
      initialDate: toDomainDate('2026-01-01'),
    })
    const category = await db.categories.where('kind').equals('income').first()
    if (!category) throw new Error('Falta categoría')
    await finance.recordIncome({
      amount: toPositiveMoneyAmount(25_000),
      currency: account.currency,
      effectiveDate: toDomainDate('2026-01-02'),
      destinationAccountId: account.id,
      categoryId: category.id,
    })

    const backup = await new BackupService(db).createBackup()

    expect(backup.format).toBe('mis-finanzas-backup')
    expect(backup.version).toBe(BACKUP_FORMAT_VERSION)
    expect(backup.databaseSchemaVersion).toBe(DATABASE_SCHEMA_VERSION)
    expect(backup.data.accounts).toHaveLength(1)
    expect(backup.data.transactions).toHaveLength(1)
    expect(validateBackupPayload(JSON.parse(JSON.stringify(backup)))).toEqual(
      backup,
    )
  })

  it('rechaza UUID duplicados dentro del respaldo', async () => {
    const account = await finance.createAccount({
      name: 'Cuenta principal',
      type: 'savings',
      currency: toCurrency('COP'),
      initialBalance: toMoneyAmount(0),
      initialDate: toDomainDate('2026-01-01'),
    })
    const backup = await new BackupService(db).createBackup()
    const invalid = {
      ...backup,
      data: { ...backup.data, accounts: [account, account] },
    }

    expect(() => validateBackupPayload(invalid)).toThrow('UUID duplicados')
  })

  it('restaura registros nuevos y omite duplicados idénticos', async () => {
    await finance.createAccount({ name: 'Origen', type: 'savings', currency: toCurrency('COP'), initialBalance: toMoneyAmount(0), initialDate: toDomainDate('2026-01-01') })
    const payload = await new BackupService(db).createBackup()
    const target = new FinanceDatabase(`restore-target-${crypto.randomUUID()}`)
    try {
      const service = new BackupService(target)
      const first = await service.restore(payload)
      const second = await service.restore(payload)
      expect(first.newRecords).toBeGreaterThan(0)
      expect(second.newRecords).toBe(0)
      expect(second.identicalRecords).toBeGreaterThan(0)
      expect(await target.accounts.count()).toBe(1)
    } finally { target.close(); await target.delete() }
  })

  it('detecta conflictos y conserva el registro local por defecto', async () => {
    const account = await finance.createAccount({ name: 'Respaldo', type: 'savings', currency: toCurrency('COP'), initialBalance: toMoneyAmount(0), initialDate: toDomainDate('2026-01-01') })
    const payload = await new BackupService(db).createBackup()
    await db.accounts.put({ ...account, name: 'Local' })
    const analysis = await new BackupService(db).restore(payload)
    expect(analysis.conflicts.some((item) => item.id === account.id)).toBe(true)
    expect((await db.accounts.get(account.id))?.name).toBe('Local')
  })


  it('restaura una copia completa y elimina datos locales que no están en el respaldo', async () => {
    const backedUp = await finance.createAccount({
      id: toUuid('71000000-0000-4000-8000-000000000001'),
      name: 'Cuenta del respaldo',
      type: 'savings',
      currency: toCurrency('COP'),
      initialBalance: toMoneyAmount(10_000),
      initialDate: toDomainDate('2026-01-01'),
    })
    const payload = await new BackupService(db).createBackup()

    await db.accounts.put({ ...backedUp, name: 'Cuenta local modificada' })
    await finance.createAccount({
      id: toUuid('71000000-0000-4000-8000-000000000002'),
      name: 'Solo local',
      type: 'cash',
      currency: toCurrency('COP'),
      initialBalance: toMoneyAmount(5_000),
      initialDate: toDomainDate('2026-01-01'),
    })

    await new BackupService(db).restore(payload, 'replace-all')

    expect(await db.accounts.count()).toBe(1)
    expect((await db.accounts.get(backedUp.id))?.name).toBe('Cuenta del respaldo')
    expect(
      await db.accounts.get(toUuid('71000000-0000-4000-8000-000000000002')),
    ).toBeUndefined()
  })

  it('rechaza referencias de tarjeta inválidas antes de escribir', async () => {
    const payload = await new BackupService(db).createBackup()
    const invalid = { ...payload, data: { ...payload.data, cardPayments: [{ id: '92000000-0000-4000-8000-000000000001', cardId: '92000000-0000-4000-8000-000000000002', type: 'refund', amount: 100, currency: 'COP', effectiveDate: '2026-01-01', status: 'confirmed', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', revision: 1 }] } }
    expect(() => validateBackupPayload(invalid)).toThrow('referencias inválidas')
  })
})

