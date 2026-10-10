import { useMemo, useState, type FormEvent } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useFinanceData } from "../../app/FinanceDataContext";
import {
  EmptyState,
  ErrorMessage,
  SuccessMessage,
} from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import {
  calculateAccountBalance,
  calculateBudget,
  calculateCardDebt,
  calculateSavingsPlan,
  checkedMoneySum,
  projectCashFlow,
  simulateDebtPlan,
  toDomainDate,
  toMoneyAmount,
  type DebtStrategy,
} from "../../domain";
import { obligationService } from "../../services/obligationService";
import { useSubmissionGuard } from "../../hooks/useSubmissionGuard";
import { currentMonthRange, todayDomainDate } from "../../utils/dates";
import {
  formatMoney,
  parseMoneyAmount,
  parsePositiveMoneyAmount,
} from "../../utils/money";

const EMPTY_GOAL = {
  name: "",
  target: "",
  current: "0",
  date: "",
  priority: "medium",
  contribution: "0",
  mode: "balanced",
};

export function PlanPage() {
  const { data } = useFinanceData();
  const currency = data.settings?.currency;
  const [strategy, setStrategy] = useState<DebtStrategy>("balanced");
  const [capacity, setCapacity] = useState("0");
  const [reserve, setReserve] = useState("0");
  const [goal, setGoal] = useState(EMPTY_GOAL);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { submitting: savingGoal, run: runGoalSubmission } = useSubmissionGuard();
  const analysis = useMemo(() => {
    if (!currency) return undefined;
    const accounts = data.accounts.filter(
      (item) => item.status === "active" && item.currency === currency,
    );
    const balance = accounts.reduce(
      (sum, item) =>
        checkedMoneySum(sum, calculateAccountBalance(item, data.transactions)),
      toMoneyAmount(0),
    );
    const range = currentMonthRange();
    const budget = calculateBudget({
      balance,
      obligations: data.recurringObligations,
      goals: data.savingsGoals,
      transactions: data.transactions,
      currency,
      from: range.from,
      to: range.to,
    });
    const flow = projectCashFlow({
      openingBalance: balance,
      from: todayDomainDate(),
      to: range.to < todayDomainDate() ? todayDomainDate() : range.to,
      transactions: [],
      obligations: data.recurringObligations,
      incomes: data.incomeSchedules,
      currency,
    });
    return { balance, budget, flow };
  }, [currency, data]);
  const debt = useMemo(() => {
    if (!currency) return undefined;
    try {
      return simulateDebtPlan({
        cards: data.creditCards,
        purchases: data.installmentPurchases,
        payments: data.cardPayments,
        monthlyCapacity: parseMoneyAmount(capacity),
        reserve: parseMoneyAmount(reserve),
        strategy,
        asOf: todayDomainDate(),
      });
    } catch {
      return undefined;
    }
  }, [capacity, reserve, strategy, currency, data]);
  const comparison = useMemo(
    () =>
      ["avalanche", "snowball", "balanced"].map((item) => {
        try {
          const result = simulateDebtPlan({
            cards: data.creditCards,
            purchases: data.installmentPurchases,
            payments: data.cardPayments,
            monthlyCapacity: parseMoneyAmount(capacity),
            reserve: parseMoneyAmount(reserve),
            strategy: item as DebtStrategy,
            asOf: todayDomainDate(),
          });
          return {
            name:
              item === "avalanche"
                ? "Avalancha"
                : item === "snowball"
                  ? "Bola de nieve"
                  : "Equilibrada",
            meses: result.estimatedMonths,
            intereses: result.estimatedInterest / 100,
          };
        } catch {
          return { name: item, meses: 0, intereses: 0 };
        }
      }),
    [capacity, reserve, data],
  );
  async function saveGoal(event: FormEvent) {
    event.preventDefault();
    await runGoalSubmission(async () => {
      setError("");
      setMessage("");
      if (!currency) return;
      try {
      await obligationService.createSavingsGoal({
        name: goal.name,
        currency,
        targetAmount: parsePositiveMoneyAmount(goal.target),
        currentAmount: parseMoneyAmount(goal.current),
        ...(goal.date ? { targetDate: toDomainDate(goal.date) } : {}),
        priority: goal.priority as "low" | "medium" | "high",
        plannedMonthlyContribution: parseMoneyAmount(goal.contribution),
        mode: goal.mode as "flexible" | "balanced" | "accelerated",
      });
      setGoal({ ...EMPTY_GOAL });
      setMessage("Meta guardada y plan recalculado.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible guardar la meta.",
      );
      }
    });
  }
  async function contribute(
    goalId: Parameters<typeof obligationService.contributeToGoal>[0],
    revision: Parameters<typeof obligationService.contributeToGoal>[1],
  ) {
    const value = window.prompt("Importe que ya reservaste para esta meta");
    if (!value) return;
    try {
      await obligationService.contributeToGoal(
        goalId,
        revision,
        parsePositiveMoneyAmount(value),
      );
      setMessage("Aporte registrado en la meta.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible registrar el aporte.",
      );
    }
  }
  if (!currency || !analysis)
    return <ErrorMessage message="Falta configurar la moneda principal." />;
  const debtTotal = data.creditCards.reduce(
    (sum, card) =>
      checkedMoneySum(
        sum,
        calculateCardDebt(card, data.installmentPurchases, data.cardPayments),
      ),
    toMoneyAmount(0),
  );
  return (
    <div className="page">
      <PageHeader
        eyebrow="Decisiones con datos"
        title="Plan financiero"
        description="Presupuesto, deuda, ahorro y proyecciones basados en tus registros."
      />
      {error ? <ErrorMessage message={error} /> : null}
      {message ? <SuccessMessage message={message} /> : null}
      <section className="summary-grid">
        <article className="summary-card">
          <div>
            <p>Disponible tras reservas</p>
            <strong>
              {formatMoney(analysis.budget.availableAfterObligations, currency)}
            </strong>
          </div>
        </article>
        <article className="summary-card">
          <div>
            <p>Presupuesto diario</p>
            <strong>{formatMoney(analysis.budget.daily, currency)}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div>
            <p>Presupuesto semanal</p>
            <strong>{formatMoney(analysis.budget.weekly, currency)}</strong>
          </div>
        </article>
        <article className="summary-card">
          <div>
            <p>Deuda total</p>
            <strong>{formatMoney(debtTotal, currency)}</strong>
          </div>
        </article>
      </section>
      <section className="panel">
        <h2>Flujo de caja proyectado</h2>
        <p className="form-hint">
          Los ingresos previstos se muestran por separado y no aumentan el
          disponible.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analysis.flow.map((item) => ({
                fecha: item.date.slice(5),
                confirmado: item.confirmed / 100,
                proyectado: item.projected / 100,
                ingresoPrevisto: item.uncertainIncome / 100,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="fecha" />
              <YAxis hide />
              <Tooltip />
              <Legend />
              <Line dataKey="confirmado" stroke="#10b981" dot={false} />
              <Line dataKey="proyectado" stroke="#38bdf8" dot={false} />
              <Line dataKey="ingresoPrevisto" stroke="#fbbf24" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <h2>Estrategias de deuda</h2>
        <div className="form-grid">
          <label>
            Capacidad mensual
            <input
              inputMode="decimal"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label>
            Reserva esencial
            <input
              inputMode="decimal"
              value={reserve}
              onChange={(e) => setReserve(e.target.value)}
            />
          </label>
        </div>
        <label>
          Estrategia
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as DebtStrategy)}
          >
            <option value="avalanche">Avalancha</option>
            <option value="snowball">Bola de nieve</option>
            <option value="balanced">Equilibrada</option>
          </select>
        </label>
        {debt ? (
          <p className="muted-copy">
            Estimación: {debt.estimatedMonths} meses · intereses{" "}
            {formatMoney(debt.estimatedInterest, currency)} ·{" "}
            {debt.payoffDate ?? "sin fecha calculable"}. Supuestos:{" "}
            {debt.assumptions.join(" ")}
          </p>
        ) : null}
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="meses" fill="#38bdf8" />
              <Bar dataKey="intereses" fill="#fbbf24" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className="panel">
        <h2>Metas de ahorro</h2>
        <form className="stack-form" onSubmit={(event) => void saveGoal(event)}>
          <label>
            Nombre
            <input
              required
              value={goal.name}
              onChange={(e) => setGoal({ ...goal, name: e.target.value })}
            />
          </label>
          <div className="form-grid">
            <label>
              Objetivo
              <input
                required
                inputMode="decimal"
                value={goal.target}
                onChange={(e) => setGoal({ ...goal, target: e.target.value })}
              />
            </label>
            <label>
              Ahorrado
              <input
                required
                inputMode="decimal"
                value={goal.current}
                onChange={(e) => setGoal({ ...goal, current: e.target.value })}
              />
            </label>
          </div>
          <div className="form-grid">
            <label>
              Aporte mensual
              <input
                required
                inputMode="decimal"
                value={goal.contribution}
                onChange={(e) =>
                  setGoal({ ...goal, contribution: e.target.value })
                }
              />
            </label>
            <label>
              Fecha objetivo
              <input
                type="date"
                value={goal.date}
                onChange={(e) => setGoal({ ...goal, date: e.target.value })}
              />
            </label>
          </div>
          <label>
            Modo
            <select
              value={goal.mode}
              onChange={(e) => setGoal({ ...goal, mode: e.target.value })}
            >
              <option value="flexible">Flexible</option>
              <option value="balanced">Equilibrado</option>
              <option value="accelerated">Acelerado</option>
            </select>
          </label>
          <button className="button button-primary" disabled={savingGoal}>
            {savingGoal ? "Guardando..." : "Guardar meta"}
          </button>
        </form>
        {data.savingsGoals.length === 0 ? (
          <EmptyState
            title="Sin metas"
            description="Crea una meta para calcular un aporte sostenible."
          />
        ) : (
          data.savingsGoals.map((item) => {
            const plan = calculateSavingsPlan(item, analysis.budget.surplus);
            return (
              <article className="schedule-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>
                    {formatMoney(item.currentAmount, currency)} de{" "}
                    {formatMoney(item.targetAmount, currency)} · sugerido{" "}
                    {formatMoney(plan.contribution, currency)}/mes
                  </span>
                </div>
                {item.status === "active" ? (
                  <button
                    className="button button-secondary button-compact"
                    type="button"
                    onClick={() => void contribute(item.id, item.revision)}
                  >
                    Registrar aporte
                  </button>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
