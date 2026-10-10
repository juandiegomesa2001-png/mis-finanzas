import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useFinanceData } from '../../app/FinanceDataContext'
import { EmptyState, ErrorMessage, SuccessMessage } from '../../components/Feedback'
import { PageHeader } from '../../components/PageHeader'
import { toDomainDate, toUuid } from '../../domain'
import { financeService } from '../../services/financeService'
import { todayDomainDate } from '../../utils/dates'
import { parsePositiveMoneyAmount } from '../../utils/money'

export function QuickExpensePage() {
  const { data } = useFinanceData()
  const accounts = data.accounts.filter(({ status }) => status === 'active')
  const categories = data.categories.filter(
    ({ kind, status }) => kind === 'expense' && status === 'active',
  )
  const preferredAccount = data.settings?.lastExpenseAccountId
  const initialAccount =
    accounts.find(({ id }) => id === preferredAccount)?.id ?? accounts[0]?.id ?? ''
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [accountId, setAccountId] = useState(initialAccount)
  const [date, setDate] = useState<string>(todayDomainDate())
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      const account = accounts.find(({ id }) => id === accountId)

      if (!account) {
        throw new Error('Selecciona una cuenta activa.')
      }

      await financeService.recordExpense({
        amount: parsePositiveMoneyAmount(amount),
        currency: account.currency,
        effectiveDate: toDomainDate(date),
        sourceAccountId: toUuid(accountId),
        categoryId: toUuid(categoryId),
        description,
      })
      setAmount('')
      setDescription('')
      setSuccess('Gasto guardado. El saldo ya fue actualizado.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible guardar el gasto.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Registrar gasto" />
        <EmptyState
          title="Primero crea una cuenta"
          description="Los gastos necesitan una cuenta de origen para afectar el saldo correctamente."
        />
        <Link className="button button-primary" to="/accounts">Crear cuenta</Link>
      </div>
    )
  }

  return (
    <div className="page quick-entry-page">
      <PageHeader
        eyebrow="Registro rápido"
        title="Nuevo gasto"
        description="Completa lo esencial y sigue con tu día."
        action={<Link className="icon-button" to="/" aria-label="Volver"><ArrowLeft aria-hidden="true" size={19} /></Link>}
      />

      <form className="quick-entry-card" onSubmit={handleSubmit}>
        <div className="amount-field">
          <span>$</span>
          <input
            autoFocus
            required
            inputMode="decimal"
            aria-label="Importe del gasto"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
          />
          <small>{accounts.find(({ id }) => id === accountId)?.currency}</small>
        </div>

        <div className="stack-form">
          <label>
            Categoría
            <select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
              <option value="" disabled>Selecciona una categoría</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            Cuenta
            <select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              {accounts.map((account) => (
                <option value={account.id} key={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <label>
            Fecha
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            Descripción <span className="label-optional">Opcional</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ej. Almuerzo" />
          </label>
        </div>

        {error ? <ErrorMessage message={error} /> : null}
        {success ? <SuccessMessage message={success} /> : null}

        <button className="button button-primary button-large" type="submit" disabled={saving}>
          {saving ? <Zap aria-hidden="true" size={19} /> : <Check aria-hidden="true" size={19} />}
          {saving ? 'Guardando…' : 'Guardar gasto'}
        </button>
      </form>
    </div>
  )
}

