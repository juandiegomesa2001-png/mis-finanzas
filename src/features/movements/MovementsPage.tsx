import { useMemo, useState, type FormEvent } from 'react'
import { Ban, Pencil, Plus, Search, X } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useFinanceData } from '../../app/FinanceDataContext'
import { EmptyState, ErrorMessage, SuccessMessage } from '../../components/Feedback'
import { PageHeader } from '../../components/PageHeader'
import { toMoneyAmount, toUuid, type Transaction } from '../../domain'
import { financeService } from '../../services/financeService'
import { useSubmissionGuard } from '../../hooks/useSubmissionGuard'
import { formatMoney } from '../../utils/money'

const TYPE_LABELS = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Transferencia',
  adjustment: 'Ajuste',
} as const

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  voided: 'Anulado',
} as const

function accountIds(transaction: Transaction): readonly string[] {
  if (transaction.type === 'income') return [transaction.destinationAccountId]
  if (transaction.type === 'expense') return transaction.sourceAccountId ? [transaction.sourceAccountId] : []
  if (transaction.type === 'transfer') {
    return [transaction.sourceAccountId, transaction.destinationAccountId]
  }
  return [transaction.accountId]
}

export function MovementsPage() {
  const { data } = useFinanceData()
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [accountId, setAccountId] = useState('all')
  const [editing, setEditing] = useState<Transaction | undefined>()
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { submitting: saving, run: runSubmission } = useSubmissionGuard()
  const { submitting: voiding, run: runVoidAction } = useSubmissionGuard()

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es')

    return [...data.transactions]
      .filter((transaction) => type === 'all' || transaction.type === type)
      .filter((transaction) => status === 'all' || transaction.status === status)
      .filter(
        (transaction) =>
          accountId === 'all' || accountIds(transaction).includes(accountId),
      )
      .filter((transaction) => {
        if (!normalizedSearch) return true
        const category = data.categories.find(
          ({ id }) => id === transaction.categoryId,
        )
        const accountNames = accountIds(transaction)
          .map((id) => data.accounts.find((account) => account.id === id)?.name)
          .filter(Boolean)
          .join(' ')
        const haystack = `${transaction.description ?? ''} ${category?.name ?? ''} ${accountNames}`.toLocaleLowerCase('es')
        return haystack.includes(normalizedSearch)
      })
      .sort((left, right) => {
        const dateComparison = right.effectiveDate.localeCompare(left.effectiveDate)
        return dateComparison || right.createdAt.localeCompare(left.createdAt)
      })
  }, [accountId, data.accounts, data.categories, data.transactions, search, status, type])

  const grouped = useMemo(() => {
    const groups = new Map<string, Transaction[]>()
    for (const transaction of filtered) {
      const group = groups.get(transaction.effectiveDate) ?? []
      group.push(transaction)
      groups.set(transaction.effectiveDate, group)
    }
    return [...groups.entries()]
  }, [filtered])

  function openEdit(transaction: Transaction) {
    setEditing(transaction)
    setDescription(transaction.description ?? '')
    setCategoryId(transaction.categoryId ?? '')
    setError('')
    setSuccess('')
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    await runSubmission(async () => {
      setError('')
      setSuccess('')
      try {
      await financeService.updateTransactionDetails(editing.id, editing.revision, {
        description: description || null,
        ...((editing.type === 'income' || editing.type === 'expense') && categoryId
          ? { categoryId: toUuid(categoryId) }
          : {}),
      })
      setEditing(undefined)
      setSuccess('Movimiento actualizado. Su revisión fue incrementada.')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No fue posible editar el movimiento.')
      }
    })
  }

  async function handleVoid(transaction: Transaction) {
    const reason = window.prompt(
      'Indica el motivo de la anulación. El movimiento se conservará en el historial:',
    )

    if (!reason) return
    await runVoidAction(async () => {
      setError('')
      setSuccess('')
      try {
      await financeService.voidTransaction(
        transaction.id,
        transaction.revision,
        reason,
      )
      setSuccess('Movimiento anulado. El registro y su trazabilidad se conservaron.')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No fue posible anular el movimiento.')
      }
    })
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Historial"
        title="Movimientos"
        description={`${data.transactions.length} registros guardados localmente`}
        action={<Link className="button button-compact button-primary" to="/income"><Plus aria-hidden="true" size={17} /> Ingreso</Link>}
      />

      <div className="action-strip">
        <Link className="action-chip" to="/expense">Registrar gasto</Link>
        <Link className="action-chip" to="/income">Registrar ingreso</Link>
        <Link className="action-chip" to="/transfer">Transferir</Link>
      </div>

      <section className="filter-panel" aria-label="Filtros de movimientos">
        <label className="search-field">
          <Search aria-hidden="true" size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar descripción, cuenta o categoría" aria-label="Buscar movimientos" />
        </label>
        <div className="filter-grid">
          <select aria-label="Filtrar por tipo" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
            <option value="transfer">Transferencias</option>
            <option value="adjustment">Ajustes</option>
          </select>
          <select aria-label="Filtrar por estado" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">Todos los estados</option>
            <option value="confirmed">Confirmados</option>
            <option value="pending">Pendientes</option>
            <option value="voided">Anulados</option>
          </select>
          <select aria-label="Filtrar por cuenta" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="all">Todas las cuentas</option>
            {data.accounts.map((account) => <option value={account.id} key={account.id}>{account.name}</option>)}
          </select>
        </div>
      </section>

      {error ? <ErrorMessage message={error} /> : null}
      {success ? <SuccessMessage message={success} /> : null}

      {editing ? (
        <section className="panel form-panel">
          <div className="section-heading"><div><p className="eyebrow">Edición controlada</p><h2>Editar detalles</h2></div><button className="icon-button" type="button" onClick={() => setEditing(undefined)} aria-label="Cerrar"><X aria-hidden="true" size={18} /></button></div>
          <p className="form-hint">El importe, fecha y cuentas de un movimiento confirmado no se sobrescriben. Para corregirlos, anula el registro y crea uno nuevo.</p>
          <form className="stack-form" onSubmit={handleEdit}>
            <label>Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            {editing.type === 'income' || editing.type === 'expense' ? (
              <label>Categoría<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{data.categories.filter((category) => category.kind === editing.type && category.status === 'active').map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
            ) : null}
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar detalles'}</button>
          </form>
        </section>
      ) : null}

      {grouped.length === 0 ? (
        <EmptyState title="Sin resultados" description={data.transactions.length === 0 ? 'Registra tu primer movimiento para verlo aquí.' : 'Prueba con filtros menos específicos.'} />
      ) : (
        <div className="history-groups">
          {grouped.map(([date, transactions]) => (
            <section className="history-group" key={date}>
              <h2>{date}</h2>
              <div className="movement-list">
                {transactions.map((transaction) => {
                  const category = data.categories.find(({ id }) => id === transaction.categoryId)
                  const source = data.accounts.find(({ id }) => id === transaction.sourceAccountId)
                  const destination = data.accounts.find(({ id }) => id === transaction.destinationAccountId)
                  const singleAccount = data.accounts.find(({ id }) => id === transaction.accountId)
                  const accountLabel = transaction.type === 'transfer' ? `${source?.name ?? 'Origen'} → ${destination?.name ?? 'Destino'}` : destination?.name ?? source?.name ?? singleAccount?.name ?? 'Sin cuenta'
                  const sign = transaction.type === 'income' ? '+' : transaction.type === 'expense' ? '−' : ''

                  return (
                    <article className={`movement-row movement-row-detailed ${transaction.status === 'voided' ? 'movement-voided' : ''}`} key={transaction.id}>
                      <span className={`movement-dot movement-dot-${transaction.type}`} aria-hidden="true" />
                      <div className="movement-copy">
                        <strong>{transaction.description || TYPE_LABELS[transaction.type]}</strong>
                        <span>{category?.name ?? TYPE_LABELS[transaction.type]} · {accountLabel}</span>
                        <span className="status-text">{STATUS_LABELS[transaction.status]} · Rev. {transaction.revision}</span>
                      </div>
                      <div className="movement-side">
                        <strong>{sign}{formatMoney(toMoneyAmount(transaction.amount), transaction.currency)}</strong>
                        {transaction.status !== 'voided' ? (
                          <div className="inline-actions">
                            <button type="button" disabled={voiding} onClick={() => openEdit(transaction)} aria-label="Editar movimiento"><Pencil aria-hidden="true" size={15} /></button>
                            <button type="button" disabled={voiding} onClick={() => void handleVoid(transaction)} aria-label="Anular movimiento"><Ban aria-hidden="true" size={15} /></button>
                          </div>
                        ) : null}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

