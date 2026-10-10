import { ArrowDownLeft, ArrowUpRight, Landmark, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useFinanceData } from '../../app/FinanceDataContext'
import { EmptyState, ErrorMessage } from '../../components/Feedback'
import { PageHeader } from '../../components/PageHeader'
import {
  calculateAccountBalance,
  calculateExpenseTotal,
  calculateIncomeTotal,
  calculateCardDebt,
  calculateBudget,
  checkedMoneySum,
  toMoneyAmount,
  type Transaction,
} from '../../domain'
import { currentMonthRange } from '../../utils/dates'
import { formatMoney } from '../../utils/money'

function movementTitle(transaction: Transaction): string {
  if (transaction.description) {
    return transaction.description
  }

  const labels = {
    income: 'Ingreso',
    expense: 'Gasto',
    transfer: 'Transferencia',
    adjustment: 'Ajuste',
  } as const

  return labels[transaction.type]
}

export function DashboardPage() {
  const { data } = useFinanceData()
  const currency = data.settings?.currency
  const activeAccounts = data.accounts.filter(({ status }) => status === 'active')
  const recentTransactions = [...data.transactions]
    .sort((left, right) =>
      right.effectiveDate.localeCompare(left.effectiveDate),
    )
    .slice(0, 5)

  if (!currency) {
    return <ErrorMessage message="Falta configurar la moneda principal." />
  }

  let totalBalance = toMoneyAmount(0)
  let incomeTotal = toMoneyAmount(0)
  let expenseTotal = toMoneyAmount(0)
  let calculationError = ''
  let debtTotal = toMoneyAmount(0)
  let available = toMoneyAmount(0)

  try {
    const balances = activeAccounts
      .filter((account) => account.currency === currency)
      .map((account) => calculateAccountBalance(account, data.transactions))
    totalBalance =
      balances.length > 0
        ? checkedMoneySum(...balances)
        : toMoneyAmount(0)
    const month = currentMonthRange()
    incomeTotal = calculateIncomeTotal(
      data.transactions,
      month,
      currency,
    )
    expenseTotal = calculateExpenseTotal(
      data.transactions,
      month,
      currency,
    )
    debtTotal = data.creditCards.filter((card) => card.currency === currency).reduce((sum, card) => checkedMoneySum(sum, calculateCardDebt(card, data.installmentPurchases, data.cardPayments)), toMoneyAmount(0))
    available = calculateBudget({ balance: totalBalance, obligations: data.recurringObligations, goals: data.savingsGoals, transactions: data.transactions, currency, from: month.from, to: month.to }).availableAfterObligations
  } catch (error) {
    calculationError =
      error instanceof Error
        ? error.message
        : 'No fue posible calcular el resumen.'
  }

  if (calculationError) {
    return (
      <div className="page page-dashboard">
        <ErrorMessage message={calculationError} />
      </div>
    )
  }

  return (
    <div className="page page-dashboard">
      <PageHeader eyebrow="Mis Finanzas" title="Tu dinero, con claridad" description="Datos guardados en este dispositivo" />
      <section className="balance-hero" aria-label="Saldo total"><div className="balance-icon"><Landmark aria-hidden="true" size={23} /></div><p>Saldo total disponible</p><strong>{formatMoney(totalBalance, currency)}</strong><span>{activeAccounts.filter((account) => account.currency === currency).length} {activeAccounts.filter((account) => account.currency === currency).length === 1 ? 'cuenta activa' : 'cuentas activas'} en {currency}</span></section>
      <section className="summary-grid" aria-label="Resumen del mes">
        <article className="summary-card"><span className="summary-icon summary-icon-income"><ArrowDownLeft aria-hidden="true" size={18} /></span><div><p>Ingresos del mes</p><strong>{formatMoney(incomeTotal, currency)}</strong></div></article>
        <article className="summary-card"><span className="summary-icon summary-icon-expense"><ArrowUpRight aria-hidden="true" size={18} /></span><div><p>Gastos del mes</p><strong>{formatMoney(expenseTotal, currency)}</strong></div></article>
        <article className="summary-card"><div><p>Disponible real</p><strong>{formatMoney(available, currency)}</strong></div></article>
        <article className="summary-card"><div><p>Patrimonio neto</p><strong>{formatMoney(toMoneyAmount(totalBalance - debtTotal), currency)}</strong></div></article>
      </section>
      {data.reminders.filter((item) => !item.dismissed).length ? <section className="panel"><h2>Próximos avisos</h2>{data.reminders.filter((item) => !item.dismissed).slice(0,3).map((item) => <p className="muted-copy" key={item.id}>{item.title} · {item.dueDate}</p>)}</section> : null}
      <section className="section-block">
        <div className="section-heading"><div><p className="eyebrow">Actividad</p><h2>Movimientos recientes</h2></div><Link className="text-link" to="/movements">Ver todos</Link></div>
        {recentTransactions.length === 0 ? <EmptyState title="Todavía no hay movimientos" description="Registra tu primer ingreso o gasto para comenzar." /> : (
          <div className="movement-list">{recentTransactions.map((transaction) => {
            const isIncome = transaction.type === 'income'
            const isExpense = transaction.type === 'expense'
            const prefix = isIncome ? '+' : isExpense ? '−' : ''
            return <article className="movement-row" key={transaction.id}><span className={`movement-dot movement-dot-${transaction.type}`}><WalletCards aria-hidden="true" size={18} /></span><div className="movement-copy"><strong>{movementTitle(transaction)}</strong><span>{transaction.effectiveDate} · {transaction.status === 'voided' ? 'Anulado' : transaction.status === 'pending' ? 'Pendiente' : 'Confirmado'}</span></div><strong className={isIncome ? 'amount-income' : isExpense ? 'amount-expense' : 'amount-neutral'}>{prefix}{formatMoney(toMoneyAmount(transaction.amount), currency)}</strong></article>
          })}</div>
        )}
      </section>
    </div>
  )
}

