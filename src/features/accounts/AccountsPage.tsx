import { useState, type FormEvent } from 'react'
import { Archive, Landmark, Pencil, Plus, X } from 'lucide-react'

import { useFinanceData } from '../../app/FinanceDataContext'
import { EmptyState, ErrorMessage, SuccessMessage } from '../../components/Feedback'
import { PageHeader } from '../../components/PageHeader'
import {
  calculateAccountBalance,
  toDomainDate,
  type Account,
  type AccountType,
} from '../../domain'
import { financeService } from '../../services/financeService'
import { todayDomainDate } from '../../utils/dates'
import { formatMoney, parseMoneyAmount } from '../../utils/money'

interface AccountFormState {
  readonly name: string
  readonly institution: string
  readonly type: AccountType
  readonly initialBalance: string
  readonly initialDate: string
}

const EMPTY_FORM: AccountFormState = {
  name: '',
  institution: '',
  type: 'savings',
  initialBalance: '0',
  initialDate: todayDomainDate(),
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  savings: 'Ahorros',
  checking: 'Corriente',
  cash: 'Efectivo',
  digital_wallet: 'Billetera digital',
  savings_reserve: 'Ahorro reservado',
  other: 'Otra',
}

function accountToForm(account: Account): AccountFormState {
  return {
    name: account.name,
    institution: account.institution ?? '',
    type: account.type,
    initialBalance: String(account.initialBalance / 100),
    initialDate: account.initialDate,
  }
}

export function AccountsPage() {
  const { data } = useFinanceData()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>()
  const [form, setForm] = useState<AccountFormState>(EMPTY_FORM)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const settingsCurrency = data.settings?.currency

  function openCreate() {
    setEditing(undefined)
    setForm({ ...EMPTY_FORM, initialDate: todayDomainDate() })
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setForm(accountToForm(account))
    setError('')
    setSuccess('')
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      if (!settingsCurrency) {
        throw new Error('Falta configurar la moneda principal.')
      }

      if (editing) {
        await financeService.updateAccount(editing.id, editing.revision, {
          name: form.name,
          institution: form.institution || null,
          type: form.type,
          initialBalance: parseMoneyAmount(form.initialBalance),
          initialDate: toDomainDate(form.initialDate),
        })
        setSuccess('Cuenta actualizada correctamente.')
      } else {
        await financeService.createAccount({
          name: form.name,
          institution: form.institution,
          type: form.type,
          currency: settingsCurrency,
          initialBalance: parseMoneyAmount(form.initialBalance),
          initialDate: toDomainDate(form.initialDate),
        })
        setSuccess('Cuenta creada correctamente.')
      }

      setShowForm(false)
      setEditing(undefined)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible guardar la cuenta.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleArchive(account: Account) {
    if (
      !window.confirm(
        `¿Archivar “${account.name}”? Sus movimientos se conservarán.`,
      )
    ) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await financeService.archiveAccount(account.id, account.revision)
      setSuccess('Cuenta archivada. Su historial permanece intacto.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible archivar la cuenta.',
      )
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Patrimonio líquido"
        title="Cuentas"
        description="Los saldos se reconstruyen desde el saldo inicial y los movimientos confirmados."
        action={
          <button className="button button-compact button-primary" type="button" onClick={openCreate}>
            <Plus aria-hidden="true" size={17} /> Nueva
          </button>
        }
      />

      {success ? <SuccessMessage message={success} /> : null}
      {error ? <ErrorMessage message={error} /> : null}

      {showForm ? (
        <section className="panel form-panel">
          <div className="section-heading">
            <h2>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</h2>
            <button className="icon-button" type="button" onClick={() => setShowForm(false)} aria-label="Cerrar formulario">
              <X aria-hidden="true" size={19} />
            </button>
          </div>
          <form className="stack-form" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </label>
            <label>
              Institución
              <input value={form.institution} onChange={(event) => setForm({ ...form, institution: event.target.value })} />
            </label>
            <label>
              Tipo
              <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as AccountType })}>
                {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Saldo inicial
                <input required inputMode="decimal" value={form.initialBalance} onChange={(event) => setForm({ ...form, initialBalance: event.target.value })} />
              </label>
              <label>
                Fecha inicial
                <input required type="date" value={form.initialDate} onChange={(event) => setForm({ ...form, initialDate: event.target.value })} />
              </label>
            </div>
            {editing ? (
              <p className="form-hint">Si ya existen movimientos confirmados, el saldo y la fecha inicial no se pueden cambiar.</p>
            ) : null}
            <button className="button button-primary" type="submit" disabled={saving}>
              {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cuenta'}
            </button>
          </form>
        </section>
      ) : null}

      {data.accounts.length === 0 ? (
        <EmptyState title="No tienes cuentas" description="Crea una cuenta para empezar a registrar movimientos reales." />
      ) : (
        <div className="account-grid">
          {data.accounts.map((account) => {
            let balanceLabel = 'No disponible'

            try {
              balanceLabel = formatMoney(
                calculateAccountBalance(account, data.transactions),
                account.currency,
              )
            } catch {
              balanceLabel = 'Error de cálculo'
            }

            return (
              <article className={`account-card ${account.status === 'archived' ? 'account-card-archived' : ''}`} key={account.id}>
                <div className="account-card-top">
                  <span className="account-icon"><Landmark aria-hidden="true" size={19} /></span>
                  <span className="status-pill">{account.status === 'active' ? 'Activa' : 'Archivada'}</span>
                </div>
                <p>{account.institution ?? ACCOUNT_TYPE_LABELS[account.type]}</p>
                <h2>{account.name}</h2>
                <strong className="account-balance">{balanceLabel}</strong>
                <div className="card-actions">
                  <button className="button button-secondary button-compact" type="button" onClick={() => openEdit(account)}>
                    <Pencil aria-hidden="true" size={15} /> Editar
                  </button>
                  {account.status === 'active' ? (
                    <button className="button button-danger-ghost button-compact" type="button" onClick={() => void handleArchive(account)}>
                      <Archive aria-hidden="true" size={15} /> Archivar
                    </button>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

