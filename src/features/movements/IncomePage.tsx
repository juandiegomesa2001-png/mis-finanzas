import { useState, type FormEvent } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useFinanceData } from '../../app/FinanceDataContext'
import { EmptyState, ErrorMessage, SuccessMessage } from '../../components/Feedback'
import { PageHeader } from '../../components/PageHeader'
import { toDomainDate, toUuid } from '../../domain'
import { financeService } from '../../services/financeService'
import { useSubmissionGuard } from '../../hooks/useSubmissionGuard'
import { todayDomainDate } from '../../utils/dates'
import { parsePositiveMoneyAmount } from '../../utils/money'

export function IncomePage() {
  const { data } = useFinanceData()
  const accounts = data.accounts.filter(({ status }) => status === 'active')
  const categories = data.categories.filter(
    ({ kind, status }) => kind === 'income' && status === 'active',
  )
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [date, setDate] = useState<string>(todayDomainDate())
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { submitting: saving, run: runSubmission } = useSubmissionGuard()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runSubmission(async () => {
      setError('')
      setSuccess('')
      try {
      const account = accounts.find(({ id }) => id === accountId)

      if (!account) {
        throw new Error('Selecciona una cuenta activa.')
      }

      await financeService.recordIncome({
        amount: parsePositiveMoneyAmount(amount),
        currency: account.currency,
        effectiveDate: toDomainDate(date),
        destinationAccountId: toUuid(accountId),
        categoryId: toUuid(categoryId),
        description,
      })
      setAmount('')
      setDescription('')
      setCategoryId(categories[0]?.id ?? '')
      setAccountId(accounts[0]?.id ?? '')
      setDate(todayDomainDate())
      setSuccess('Ingreso guardado y saldo actualizado.')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No fue posible guardar el ingreso.')
      }
    })
  }

  if (accounts.length === 0) {
    return <div className="page"><PageHeader title="Registrar ingreso" /><EmptyState title="Primero crea una cuenta" description="El ingreso necesita una cuenta de destino." /><Link className="button button-primary" to="/accounts">Crear cuenta</Link></div>
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Movimiento" title="Registrar ingreso" description="Solo los ingresos confirmados aumentan el saldo." action={<Link className="icon-button" to="/movements" aria-label="Volver"><ArrowLeft aria-hidden="true" size={19} /></Link>} />
      <form className="panel stack-form" onSubmit={handleSubmit}>
        <label>Importe<input autoFocus required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></label>
        <label>Categoría<select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)}><option value="" disabled>Selecciona</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label>
        <label>Cuenta de destino<select required value={accountId} onChange={(event) => setAccountId(event.target.value)}>{accounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}</select></label>
        <label>Fecha<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Descripción <span className="label-optional">Opcional</span><input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error ? <ErrorMessage message={error} /> : null}
        {success ? <SuccessMessage message={success} /> : null}
        <button className="button button-primary" type="submit" disabled={saving}><Check aria-hidden="true" size={18} />{saving ? 'Guardando…' : 'Guardar ingreso'}</button>
      </form>
    </div>
  )
}

