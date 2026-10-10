import { useState, type FormEvent } from 'react'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useFinanceData } from '../../app/FinanceDataContext'
import { ErrorMessage } from '../../components/Feedback'
import {
  toCurrency,
  toDomainDate,
  type AccountType,
  type IncomeFrequency,
} from '../../domain'
import { financeService } from '../../services/financeService'
import { todayDomainDate } from '../../utils/dates'
import {
  parseMoneyAmount,
  parsePositiveMoneyAmount,
} from '../../utils/money'

export function OnboardingPage() {
  const navigate = useNavigate()
  const { data } = useFinanceData()
  const [currency, setCurrency] = useState(data.settings?.currency ?? 'COP')
  const [accountName, setAccountName] = useState('')
  const [institution, setInstitution] = useState('')
  const [accountType, setAccountType] = useState<AccountType>('savings')
  const [initialBalance, setInitialBalance] = useState('0')
  const [initialDate, setInitialDate] = useState<string>(todayDomainDate())
  const [incomeName, setIncomeName] = useState('')
  const [incomeAmount, setIncomeAmount] = useState('')
  const [incomeFrequency, setIncomeFrequency] =
    useState<IncomeFrequency>('monthly')
  const [incomeDate, setIncomeDate] = useState<string>(todayDomainDate())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const selectedCurrency = toCurrency(currency)
      const account = accountName.trim()
        ? {
            name: accountName,
            institution,
            type: accountType,
            initialBalance: parseMoneyAmount(initialBalance),
            initialDate: toDomainDate(initialDate),
          }
        : undefined
      const income = incomeName.trim() && incomeAmount.trim()
        ? {
            name: incomeName,
            amount: parsePositiveMoneyAmount(incomeAmount),
            frequency: incomeFrequency,
            nextEstimatedDate: toDomainDate(incomeDate),
          }
        : undefined

      await financeService.completeOnboarding({
        currency: selectedCurrency,
        ...(account ? { account } : {}),
        ...(income ? { income } : {}),
      })
      navigate('/')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible guardar la configuración.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleSkip() {
    if (data.settings) {
      navigate('/')
      return
    }

    setError('')
    setSaving(true)

    try {
      await financeService.skipOnboarding(toCurrency(currency))
      navigate('/')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'No fue posible omitir la configuración.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-intro">
        <span className="brand-mark">MF</span>
        <p className="eyebrow">Configuración inicial</p>
        <h1>Empieza con una base financiera confiable</h1>
        <p>
          Tus datos se guardan localmente. Puedes completar solo lo que tengas a
          mano y volver después.
        </p>
        <div className="trust-row">
          <ShieldCheck aria-hidden="true" size={18} />
          <span>Sin movimientos de demostración</span>
        </div>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit}>
        <section className="form-card">
          <div className="step-label">1</div>
          <div className="form-card-copy">
            <h2>Moneda principal</h2>
            <p>Los totales del inicio se mostrarán en esta moneda.</p>
            <label>
              Moneda
              <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                <option value="COP">Peso colombiano (COP)</option>
                <option value="USD">Dólar estadounidense (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </label>
          </div>
        </section>

        <section className="form-card">
          <div className="step-label">2</div>
          <div className="form-card-copy">
            <h2>Primera cuenta <span>Opcional</span></h2>
            <p>Déjala vacía si prefieres crearla más adelante.</p>
            <div className="form-grid">
              <label className="field-wide">
                Nombre de la cuenta
                <input
                  value={accountName}
                  onChange={(event) => setAccountName(event.target.value)}
                  placeholder="Ej. Cuenta principal"
                />
              </label>
              <label>
                Institución
                <input
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                  placeholder="Opcional"
                />
              </label>
              <label>
                Tipo
                <select
                  value={accountType}
                  onChange={(event) => setAccountType(event.target.value as AccountType)}
                >
                  <option value="savings">Ahorros</option>
                  <option value="checking">Corriente</option>
                  <option value="cash">Efectivo</option>
                  <option value="digital_wallet">Billetera digital</option>
                  <option value="savings_reserve">Ahorro reservado</option>
                  <option value="other">Otra</option>
                </select>
              </label>
              <label>
                Saldo inicial
                <input
                  inputMode="decimal"
                  value={initialBalance}
                  onChange={(event) => setInitialBalance(event.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                Fecha inicial
                <input
                  type="date"
                  value={initialDate}
                  onChange={(event) => setInitialDate(event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        <section className="form-card">
          <div className="step-label">3</div>
          <div className="form-card-copy">
            <h2>Ingreso habitual <span>Opcional</span></h2>
            <p>Se guardará como programación, no como dinero ya recibido.</p>
            <div className="form-grid">
              <label className="field-wide">
                Nombre
                <input
                  value={incomeName}
                  onChange={(event) => setIncomeName(event.target.value)}
                  placeholder="Ej. Salario"
                />
              </label>
              <label>
                Importe estimado
                <input
                  inputMode="decimal"
                  value={incomeAmount}
                  onChange={(event) => setIncomeAmount(event.target.value)}
                  placeholder="0"
                />
              </label>
              <label>
                Frecuencia
                <select
                  value={incomeFrequency}
                  onChange={(event) =>
                    setIncomeFrequency(event.target.value as IncomeFrequency)
                  }
                >
                  <option value="monthly">Mensual</option>
                  <option value="biweekly">Quincenal</option>
                  <option value="weekly">Semanal</option>
                  <option value="variable">Variable</option>
                </select>
              </label>
              <label className="field-wide">
                Próxima fecha estimada
                <input
                  type="date"
                  value={incomeDate}
                  onChange={(event) => setIncomeDate(event.target.value)}
                />
              </label>
            </div>
          </div>
        </section>

        {error ? <ErrorMessage message={error} /> : null}

        <div className="onboarding-actions">
          <button className="button button-ghost" type="button" onClick={handleSkip} disabled={saving}>
            {data.settings ? 'Volver sin cambios' : 'Omitir por ahora'}
          </button>
          <button className="button button-primary" type="submit" disabled={saving}>
            <Sparkles aria-hidden="true" size={18} />
            {saving ? 'Guardando…' : 'Guardar y continuar'}
            <ArrowRight aria-hidden="true" size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}

