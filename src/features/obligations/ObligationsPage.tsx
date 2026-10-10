import { useState, type FormEvent } from "react";

import { useFinanceData } from "../../app/FinanceDataContext";
import {
  EmptyState,
  ErrorMessage,
  SuccessMessage,
} from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import {
  toDomainDate,
  type ObligationFrequency,
  type ObligationKind,
  type UUID,
} from "../../domain";
import { obligationService } from "../../services/obligationService";
import { todayDomainDate } from "../../utils/dates";
import { formatMoney, parsePositiveMoneyAmount } from "../../utils/money";

export function ObligationsPage() {
  const { data } = useFinanceData();
  const currency = data.settings?.currency;
  const [form, setForm] = useState({
    name: "",
    kind: "fixed_expense" as ObligationKind,
    categoryId: "",
    amount: "",
    frequency: "monthly" as ObligationFrequency,
    dueDate: todayDomainDate() as string,
    accountId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const categories = data.categories.filter(
    (item) => item.kind === "expense" && item.status === "active",
  );
  const accounts = data.accounts.filter((item) => item.status === "active");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      if (!currency) throw new Error("Falta configurar la moneda.");
      await obligationService.createObligation({
        name: form.name,
        kind: form.kind,
        categoryId: form.categoryId as UUID,
        currency,
        expectedAmount: parsePositiveMoneyAmount(form.amount),
        frequency: form.frequency,
        nextDueDate: toDomainDate(form.dueDate),
        ...(form.accountId ? { paymentAccountId: form.accountId as UUID } : {}),
      });
      await obligationService.refreshReminders();
      setSuccess("Obligación guardada.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No fue posible guardar.",
      );
    }
  }
  async function pay(
    id: UUID,
    revision: Parameters<typeof obligationService.markObligationPaid>[1],
    accountId?: UUID,
  ) {
    const selected = accountId ?? accounts[0]?.id;
    if (!selected) {
      setError("Crea una cuenta para registrar el pago.");
      return;
    }
    if (
      !window.confirm(
        "¿Confirmar el pago? Se registrará un gasto real y no se podrá eliminar físicamente.",
      )
    )
      return;
    try {
      await obligationService.markObligationPaid(id, revision, selected);
      await obligationService.refreshReminders();
      setSuccess("Pago registrado una sola vez.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible registrar el pago.",
      );
    }
  }
  async function bill(
    id: UUID,
    revision: Parameters<typeof obligationService.billObligation>[1],
  ) {
    const value = window.prompt("Valor real facturado");
    if (!value) return;
    try {
      await obligationService.billObligation(
        id,
        revision,
        parsePositiveMoneyAmount(value),
      );
      setSuccess("Valor facturado actualizado.");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No fue posible facturar.",
      );
    }
  }
  async function advance(
    id: UUID,
    revision: Parameters<typeof obligationService.advanceObligation>[1],
    variable: boolean,
  ) {
    const nextDate = variable
      ? window.prompt("Próxima fecha (YYYY-MM-DD)")
      : undefined;
    if (variable && !nextDate) return;
    try {
      await obligationService.advanceObligation(
        id,
        revision,
        nextDate ? toDomainDate(nextDate) : undefined,
      );
      await obligationService.refreshReminders();
      setSuccess("Siguiente ciclo preparado.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible avanzar el ciclo.",
      );
    }
  }
  return (
    <div className="page">
      <PageHeader
        eyebrow="Compromisos"
        title="Obligaciones"
        description="Gastos fijos, servicios y suscripciones con fechas reales."
      />
      {error ? <ErrorMessage message={error} /> : null}
      {success ? <SuccessMessage message={success} /> : null}
      <form
        className="panel stack-form"
        onSubmit={(event) => void submit(event)}
      >
        <label>
          Nombre
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <div className="form-grid">
          <label>
            Tipo
            <select
              value={form.kind}
              onChange={(e) =>
                setForm({ ...form, kind: e.target.value as ObligationKind })
              }
            >
              <option value="fixed_expense">Gasto fijo</option>
              <option value="utility">Servicio</option>
              <option value="subscription">Suscripción</option>
            </select>
          </label>
          <label>
            Periodicidad
            <select
              value={form.frequency}
              onChange={(e) =>
                setForm({
                  ...form,
                  frequency: e.target.value as ObligationFrequency,
                })
              }
            >
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="quarterly">Trimestral</option>
              <option value="yearly">Anual</option>
              <option value="variable">Variable</option>
            </select>
          </label>
        </div>
        <div className="form-grid">
          <label>
            Valor previsto
            <input
              required
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </label>
          <label>
            Próximo vencimiento
            <input
              required
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </label>
        </div>
        <label>
          Categoría
          <select
            required
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Selecciona</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cuenta de pago
          <select
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
          >
            <option value="">Definir al pagar</option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary">Guardar obligación</button>
      </form>
      <section className="section-block">
        {data.recurringObligations.length === 0 ? (
          <EmptyState
            title="Sin obligaciones"
            description="Registra gastos fijos, servicios o suscripciones."
          />
        ) : (
          data.recurringObligations.map((item) => (
            <article className="schedule-row" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>
                  {item.kind === "subscription"
                    ? "Suscripción"
                    : item.kind === "utility"
                      ? "Servicio"
                      : "Gasto fijo"}{" "}
                  · vence {item.nextDueDate} · {item.status}
                </span>
              </div>
              <strong>
                {formatMoney(
                  item.billedAmount ?? item.expectedAmount,
                  item.currency,
                )}
              </strong>
              <div className="card-actions">
                {item.status === "planned" ? (
                  <button
                    className="button button-secondary button-compact"
                    onClick={() => void bill(item.id, item.revision)}
                  >
                    Facturar
                  </button>
                ) : null}
                {item.status !== "paid" ? (
                  <button
                    className="button button-secondary button-compact"
                    onClick={() =>
                      void pay(item.id, item.revision, item.paymentAccountId)
                    }
                  >
                    Marcar pagado
                  </button>
                ) : null}
                {item.status === "paid" ? (
                  <button
                    className="button button-secondary button-compact"
                    onClick={() =>
                      void advance(
                        item.id,
                        item.revision,
                        item.frequency === "variable",
                      )
                    }
                  >
                    Siguiente ciclo
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
