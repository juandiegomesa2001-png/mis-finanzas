import { endOfMonth, format, subMonths } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useFinanceData } from "../../app/FinanceDataContext";
import {
  calculateAccountBalance,
  calculateCardDebt,
  calculateExpenseTotal,
  calculateIncomeTotal,
  checkedMoneySum,
  toDomainDate,
  toMoneyAmount,
} from "../../domain";
import { currentMonthRange } from "../../utils/dates";

const REPORT_BASE_DATE = new Date();

export function ReportsPanel() {
  const { data } = useFinanceData();
  const currency = data.settings?.currency;
  if (!currency) return null;
  const month = currentMonthRange();
  const income = calculateIncomeTotal(data.transactions, month, currency);
  const expense = calculateExpenseTotal(data.transactions, month, currency);
  const categories = data.categories
    .filter((item) => item.kind === "expense")
    .map((category) => ({
      name: category.name,
      value: data.transactions
        .filter(
          (item) =>
            item.type === "expense" &&
            item.status === "confirmed" &&
            item.categoryId === category.id &&
            item.currency === currency &&
            item.effectiveDate >= month.from &&
            item.effectiveDate <= month.to,
        )
        .reduce((sum, item) => sum + item.amount / 100, 0),
    }))
    .filter((item) => item.value > 0);
  const evolution = Array.from({ length: 6 }, (_, index) => {
    const date = subMonths(REPORT_BASE_DATE, 5 - index);
    const end = toDomainDate(
      format(
        endOfMonth(date),
        "yyyy-MM-dd",
      ),
    );
    const transactions = data.transactions.filter(
      (item) => item.effectiveDate <= end,
    );
    const assets = data.accounts
      .filter(
        (item) =>
          item.status === "active" &&
          item.currency === currency &&
          item.initialDate <= end,
      )
      .reduce(
        (sum, account) =>
          checkedMoneySum(sum, calculateAccountBalance(account, transactions)),
        toMoneyAmount(0),
      );
    const purchases = data.installmentPurchases.filter(
      (item) => item.purchaseDate <= end,
    );
    const payments = data.cardPayments.filter(
      (item) => item.effectiveDate <= end,
    );
    const debt = data.creditCards
      .filter((item) => item.currency === currency)
      .reduce(
        (sum, card) =>
          checkedMoneySum(sum, calculateCardDebt(card, purchases, payments)),
        toMoneyAmount(0),
      );
    return {
      mes: format(date, "MMM"),
      saldo: assets / 100,
      deuda: debt / 100,
      patrimonio: (assets - debt) / 100,
    };
  });
  const cards = data.creditCards
    .filter((item) => item.currency === currency)
    .map((card) => {
      const debt = calculateCardDebt(
        card,
        data.installmentPurchases,
        data.cardPayments,
      );
      return {
        name: card.name,
        uso: Math.round((Math.max(0, debt) / card.creditLimit) * 100),
        deuda: debt / 100,
      };
    });
  const goals = data.savingsGoals
    .filter((item) => item.currency === currency)
    .map((item) => ({
      name: item.name,
      ahorrado: item.currentAmount / 100,
      objetivo: item.targetAmount / 100,
    }));
  return (
    <section className="reports">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Reportes</p>
          <h2>Lectura de tus datos reales</h2>
        </div>
      </div>
      <div className="report-grid">
        <article className="panel">
          <h2>Ingresos vs. gastos</h2>
          <div className="chart">
            <ResponsiveContainer>
              <BarChart
                data={[
                  {
                    mes: "Mes actual",
                    ingresos: income / 100,
                    gastos: expense / 100,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" />
                <YAxis hide />
                <Tooltip />
                <Legend />
                <Bar dataKey="ingresos" fill="#10b981" />
                <Bar dataKey="gastos" fill="#f87171" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <h2>Gasto por categoría</h2>
          {categories.length ? (
            <div className="chart">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={78}
                    fill="#38bdf8"
                    label
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted-copy">Sin gastos confirmados este mes.</p>
          )}
        </article>
        <article className="panel">
          <h2>Saldo, deuda y patrimonio</h2>
          <div className="chart">
            <ResponsiveContainer>
              <LineChart data={evolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" />
                <YAxis hide />
                <Tooltip />
                <Legend />
                <Line dataKey="saldo" stroke="#10b981" />
                <Line dataKey="deuda" stroke="#f87171" />
                <Line dataKey="patrimonio" stroke="#38bdf8" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel">
          <h2>Utilización de tarjetas</h2>
          {cards.length ? (
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={cards}>
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip />
                  <Bar dataKey="uso" name="Uso %" fill="#fbbf24" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted-copy">Sin tarjetas registradas.</p>
          )}
        </article>
        <article className="panel">
          <h2>Ahorro acumulado</h2>
          {goals.length ? (
            <div className="chart">
              <ResponsiveContainer>
                <BarChart data={goals}>
                  <XAxis dataKey="name" />
                  <YAxis hide />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ahorrado" fill="#10b981" />
                  <Bar dataKey="objetivo" fill="#38bdf8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted-copy">Sin metas registradas.</p>
          )}
        </article>
        <article className="panel">
          <h2>Cumplimiento mensual</h2>
          <p className="muted-copy">
            Gasto confirmado:{" "}
            {expense > 0
              ? Math.round((expense / Math.max(1, income)) * 100)
              : 0}
            % de los ingresos confirmados. Los pagos de principal y
            transferencias están excluidos.
          </p>
        </article>
      </div>
    </section>
  );
}
