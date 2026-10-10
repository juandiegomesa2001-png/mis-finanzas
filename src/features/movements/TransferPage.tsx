import { useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRightLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useFinanceData } from '../../app/FinanceDataContext'
import { EmptyState, ErrorMessage, SuccessMessage } from '../../components/Feedback'
import { PageHeader } from '../../components/PageHeader'
import { toDomainDate, toUuid } from '../../domain'
import { financeService } from '../../services/financeService'
import { useSubmissionGuard } from '../../hooks/useSubmissionGuard'
import { todayDomainDate } from '../../utils/dates'
import { parsePositiveMoneyAmount } from '../../utils/money'

export function TransferPage() {
  const { data } = useFinanceData()
  const accounts = data.accounts.filter(({ status }) => status === 'active')
  const [amount, setAmount] = useState('')
  const [sourceId, setSourceId] = useState(accounts[0]?.id ?? '')
  const [destinationId, setDestinationId] = useState(accounts[1]?.id ?? '')
  const [date, setDate] = useState<string>(todayDomainDate())
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { submitting: saving, run: runSubmission } = useSubmissionGuard()
  const sourceAccount = accounts.find(({ id }) => id === sourceId)
  const compatibleDestinations = accounts.filter(
    (account) => account.id !== sourceId && account.currency === sourceAccount?.currency,
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await runSubmission(async () => {
      setError('')
      setSuccess('')
      try {
      if (!sourceAccount) {
        throw new Error('Selecciona una cuenta de origen.')
      }

      await financeService.recordTransfer({
        amount: parsePositiveMoneyAmount(amount),
        currency: sourceAccount.currency,
        effectiveDate: toDomainDate(date),
        sourceAccountId: toUuid(sourceId),
        destinationAccountId: toUuid(destinationId),
        description,
      })
      setAmount('')
      setDescription('')
      setSourceId(accounts[0]?.id ?? '')
      setDestinationId(accounts[1]?.id ?? '')
      setDate(todayDomainDate())
      setSuccess('Transferencia guardada sin contabilizarla como ingreso o gasto.')
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'No fue posible guardar la transferencia.')
      }
    })
  }

  if (accounts.length < 2) {
    return <div className="page"><PageHeader title="Transferir" /><EmptyState title="Necesitas dos cuentas" description="Crea al menos dos cuentas activas para registrar una transferencia." /><Link className="button button-primary" to="/accounts">Administrar cuentas</Link></div>
  }

  return (
    <div className="page">
      <PageHeader eyebrow="Movimiento interno" title="Transferir entre cuentas" description="Un solo movimiento afecta ambos saldos y no altera ingresos ni gastos." action={<Link className="icon-button" to="/movements" aria-label="Volver"><ArrowLeft aria-hidden="true" size={19} /></Link>} />
      <form className="panel stack-form" onSubmit={handleSubmit}>
        <label>Importe<input autoFocus required inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" /></label>
        <label>Cuenta de origen<select required value={sourceId} onChange={(event) => { setSourceId(event.target.value); setDestinationId('') }} >{accounts.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}</select></label>
        <div className="transfer-arrow"><ArrowRightLeft aria-hidden="true" size={20} /></div>
        <label>Cuenta de destino<select required value={destinationId} onChange={(event) => setDestinationId(event.target.value)}><option value="" disabled>Selecciona</option>{compatibleDestinations.map((account) => <option value={account.id} key={account.id}>{account.name} · {account.currency}</option>)}</select></label>
        {compatibleDestinations.length === 0 ? <p className="form-hint">No hay otra cuenta activa con la misma moneda.</p> : null}
        <label>Fecha<input required type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label>Descripción <span className="label-optional">Opcional</span><input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
        {error ? <ErrorMessage message={error} /> : null}
        {success ? <SuccessMessage message={success} /> : null}
        <button className="button button-primary" type="submit" disabled={saving || compatibleDestinations.length === 0}><ArrowRightLeft aria-hidden="true" size={18} />{saving ? 'Guardando…' : 'Guardar transferencia'}</button>
      </form>
    </div>
  )
}

