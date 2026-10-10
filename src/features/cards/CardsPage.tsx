import { useState, type FormEvent } from "react";
import { CreditCard as CardIcon, Plus } from "lucide-react";

import { useFinanceData } from "../../app/FinanceDataContext";
import {
  EmptyState,
  ErrorMessage,
  SuccessMessage,
} from "../../components/Feedback";
import { PageHeader } from "../../components/PageHeader";
import {
  calculateCardDebt,
  nextCardDate,
  toDomainDate,
  toMoneyAmount,
  type CardEntryType,
  type UUID,
} from "../../domain";
import { obligationService } from "../../services/obligationService";
import { todayDomainDate } from "../../utils/dates";
import {
  formatMoney,
  parseMoneyAmount,
  parsePositiveMoneyAmount,
} from "../../utils/money";

export function CardsPage() {
  const { data } = useFinanceData();
  const currency = data.settings?.currency;
  const [mode, setMode] = useState<"card" | "purchase" | "payment">("card");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cardForm, setCardForm] = useState({
    bank: "",
    name: "",
    brand: "visa",
    lastFour: "",
    limit: "",
    debt: "0",
    rate: "",
    closingDay: "15",
    dueDay: "5",
    minimum: "0",
    total: "0",
    accountId: "",
  });
  const [purchase, setPurchase] = useState({
    cardId: "",
    categoryId: "",
    description: "",
    date: todayDomainDate() as string,
    amount: "",
    installments: "1",
    rate: "",
  });
  const [payment, setPayment] = useState({
    cardId: "",
    type: "extra_payment" as CardEntryType,
    amount: "",
    date: todayDomainDate() as string,
    accountId: "",
    categoryId: "",
    description: "",
  });
  const expenseCategories = data.categories.filter(
    (item) => item.kind === "expense" && item.status === "active",
  );
  const accounts = data.accounts.filter((item) => item.status === "active");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!currency) throw new Error("Falta configurar la moneda.");
      if (mode === "card")
        await obligationService.createCard({
          bank: cardForm.bank,
          name: cardForm.name,
          brand: cardForm.brand as "visa" | "mastercard" | "amex" | "other",
          ...(cardForm.lastFour ? { lastFour: cardForm.lastFour } : {}),
          currency,
          creditLimit: parsePositiveMoneyAmount(cardForm.limit),
          openingDebt: parseMoneyAmount(cardForm.debt),
          statementBalance: parseMoneyAmount(cardForm.debt),
          unbilledBalance: parseMoneyAmount("0"),
          ...(cardForm.rate
            ? {
                annualEffectiveRateBps: Math.round(Number(cardForm.rate) * 100),
              }
            : {}),
          closingDay: Number(cardForm.closingDay),
          dueDay: Number(cardForm.dueDay),
          minimumPayment: parseMoneyAmount(cardForm.minimum),
          totalPayment: parseMoneyAmount(cardForm.total),
          ...(cardForm.accountId
            ? { usualPaymentAccountId: cardForm.accountId as UUID }
            : {}),
        });
      if (mode === "purchase")
        await obligationService.createPurchase({
          cardId: purchase.cardId as UUID,
          categoryId: purchase.categoryId as UUID,
          description: purchase.description,
          purchaseDate: toDomainDate(purchase.date),
          amount: parsePositiveMoneyAmount(purchase.amount),
          installmentCount: Number(purchase.installments),
          ...(purchase.rate
            ? {
                annualEffectiveRateBps: Math.round(Number(purchase.rate) * 100),
              }
            : {}),
        });
      if (mode === "payment")
        await obligationService.recordCardEntry({
          cardId: payment.cardId as UUID,
          type: payment.type,
          amount: parsePositiveMoneyAmount(payment.amount),
          effectiveDate: toDomainDate(payment.date),
          ...(payment.accountId
            ? { paymentAccountId: payment.accountId as UUID }
            : {}),
          ...(payment.categoryId
            ? { categoryId: payment.categoryId as UUID }
            : {}),
          ...(payment.description ? { description: payment.description } : {}),
        });
      await obligationService.refreshReminders();
      setSuccess(
        mode === "card"
          ? "Tarjeta guardada."
          : mode === "purchase"
            ? "Compra y cronograma guardados sin duplicar el gasto."
            : "Operación de tarjeta guardada.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No fue posible guardar.",
      );
    }
  }

  async function reconcile(card: (typeof data.creditCards)[number]) {
    const billed = window.prompt(
      "Saldo facturado según el extracto",
      String(card.statementBalance / 100),
    );
    if (billed === null) return;
    const unbilled = window.prompt(
      "Saldo sin facturar",
      String(card.unbilledBalance / 100),
    );
    if (unbilled === null) return;
    try {
      await obligationService.reconcileStatement({
        cardId: card.id,
        expectedRevision: card.revision,
        periodEnd: todayDomainDate(),
        dueDate: nextCardDate(card.dueDay, todayDomainDate()),
        statementBalance: parseMoneyAmount(billed),
        unbilledBalance: parseMoneyAmount(unbilled),
        minimumPayment: card.minimumPayment,
        totalPayment: card.totalPayment,
      });
      setSuccess("Extracto conciliado sin modificar el historial.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible conciliar el extracto.",
      );
    }
  }

  async function markInstallment(
    id: (typeof data.installmentSchedules)[number]["id"],
    revision: (typeof data.installmentSchedules)[number]["revision"],
  ) {
    try {
      await obligationService.markInstallmentPaid(id, revision);
      setSuccess("Cuota marcada como pagada; no se creó un gasto nuevo.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No fue posible actualizar la cuota.",
      );
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Obligaciones"
        title="Tarjetas"
        description="Compras, cuotas, pagos y ciclos con trazabilidad."
      />
      {error ? <ErrorMessage message={error} /> : null}
      {success ? <SuccessMessage message={success} /> : null}
      <div className="segmented" role="tablist">
        <button
          type="button"
          onClick={() => setMode("card")}
          className={mode === "card" ? "active" : ""}
        >
          Tarjeta
        </button>
        <button
          type="button"
          onClick={() => setMode("purchase")}
          className={mode === "purchase" ? "active" : ""}
        >
          Compra
        </button>
        <button
          type="button"
          onClick={() => setMode("payment")}
          className={mode === "payment" ? "active" : ""}
        >
          Pago / ajuste
        </button>
      </div>
      <form
        className="panel stack-form"
        onSubmit={(event) => void submit(event)}
      >
        {mode === "card" ? (
          <>
            <label>
              Banco
              <input
                required
                value={cardForm.bank}
                onChange={(e) =>
                  setCardForm({ ...cardForm, bank: e.target.value })
                }
              />
            </label>
            <label>
              Nombre
              <input
                required
                value={cardForm.name}
                onChange={(e) =>
                  setCardForm({ ...cardForm, name: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Franquicia
                <select
                  value={cardForm.brand}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, brand: e.target.value })
                  }
                >
                  <option value="visa">Visa</option>
                  <option value="mastercard">Mastercard</option>
                  <option value="amex">American Express</option>
                  <option value="other">Otra</option>
                </select>
              </label>
              <label>
                Últimos 4
                <input
                  inputMode="numeric"
                  maxLength={4}
                  value={cardForm.lastFour}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, lastFour: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Cupo
                <input
                  required
                  inputMode="decimal"
                  value={cardForm.limit}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, limit: e.target.value })
                  }
                />
              </label>
              <label>
                Deuda inicial
                <input
                  required
                  inputMode="decimal"
                  value={cardForm.debt}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, debt: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Tasa E.A. %
                <input
                  inputMode="decimal"
                  value={cardForm.rate}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, rate: e.target.value })
                  }
                />
              </label>
              <label>
                Día de corte
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  value={cardForm.closingDay}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, closingDay: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Día límite
                <input
                  required
                  type="number"
                  min="1"
                  max="31"
                  value={cardForm.dueDay}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, dueDay: e.target.value })
                  }
                />
              </label>
              <label>
                Cuenta habitual
                <select
                  value={cardForm.accountId}
                  onChange={(e) =>
                    setCardForm({ ...cardForm, accountId: e.target.value })
                  }
                >
                  <option value="">Sin definir</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : null}
        {mode === "purchase" ? (
          <>
            <label>
              Tarjeta
              <select
                required
                value={purchase.cardId}
                onChange={(e) =>
                  setPurchase({ ...purchase, cardId: e.target.value })
                }
              >
                <option value="">Selecciona</option>
                {data.creditCards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Descripción
              <input
                required
                value={purchase.description}
                onChange={(e) =>
                  setPurchase({ ...purchase, description: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <label>
                Importe
                <input
                  required
                  inputMode="decimal"
                  value={purchase.amount}
                  onChange={(e) =>
                    setPurchase({ ...purchase, amount: e.target.value })
                  }
                />
              </label>
              <label>
                Fecha
                <input
                  required
                  type="date"
                  value={purchase.date}
                  onChange={(e) =>
                    setPurchase({ ...purchase, date: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Cuotas
                <input
                  required
                  type="number"
                  min="1"
                  max="120"
                  value={purchase.installments}
                  onChange={(e) =>
                    setPurchase({ ...purchase, installments: e.target.value })
                  }
                />
              </label>
              <label>
                Tasa E.A. %
                <input
                  inputMode="decimal"
                  value={purchase.rate}
                  onChange={(e) =>
                    setPurchase({ ...purchase, rate: e.target.value })
                  }
                />
              </label>
            </div>
            <label>
              Categoría
              <select
                required
                value={purchase.categoryId}
                onChange={(e) =>
                  setPurchase({ ...purchase, categoryId: e.target.value })
                }
              >
                <option value="">Selecciona</option>
                {expenseCategories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        {mode === "payment" ? (
          <>
            <label>
              Tarjeta
              <select
                required
                value={payment.cardId}
                onChange={(e) =>
                  setPayment({ ...payment, cardId: e.target.value })
                }
              >
                <option value="">Selecciona</option>
                {data.creditCards.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipo
              <select
                value={payment.type}
                onChange={(e) =>
                  setPayment({
                    ...payment,
                    type: e.target.value as CardEntryType,
                  })
                }
              >
                <option value="minimum_payment">Pago mínimo</option>
                <option value="total_payment">Pago total</option>
                <option value="extra_payment">Abono</option>
                <option value="refund">Devolución</option>
                <option value="adjustment_increase">
                  Ajuste que aumenta deuda
                </option>
                <option value="adjustment_decrease">
                  Ajuste que reduce deuda
                </option>
                <option value="interest">Interés</option>
                <option value="fee">Cargo</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Importe
                <input
                  required
                  inputMode="decimal"
                  value={payment.amount}
                  onChange={(e) =>
                    setPayment({ ...payment, amount: e.target.value })
                  }
                />
              </label>
              <label>
                Fecha
                <input
                  required
                  type="date"
                  value={payment.date}
                  onChange={(e) =>
                    setPayment({ ...payment, date: e.target.value })
                  }
                />
              </label>
            </div>
            {["minimum_payment", "total_payment", "extra_payment"].includes(
              payment.type,
            ) ? (
              <label>
                Cuenta de pago
                <select
                  required
                  value={payment.accountId}
                  onChange={(e) =>
                    setPayment({ ...payment, accountId: e.target.value })
                  }
                >
                  <option value="">Selecciona</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {["interest", "fee"].includes(payment.type) ? (
              <label>
                Categoría
                <select
                  required
                  value={payment.categoryId}
                  onChange={(e) =>
                    setPayment({ ...payment, categoryId: e.target.value })
                  }
                >
                  <option value="">Selecciona</option>
                  {expenseCategories.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </>
        ) : null}
        <button className="button button-primary" type="submit">
          <Plus size={17} /> Guardar
        </button>
      </form>
      <section className="section-block">
        <div className="section-heading">
          <h2>Tarjetas activas</h2>
        </div>
        {data.creditCards.length === 0 ? (
          <EmptyState
            title="No hay tarjetas"
            description="Registra solo los últimos cuatro dígitos; nunca guardamos número completo, CVV ni PIN."
          />
        ) : (
          <div className="account-grid">
            {data.creditCards.map((card) => {
              const debt = calculateCardDebt(
                card,
                data.installmentPurchases,
                data.cardPayments,
              );
              return (
                <article className="account-card" key={card.id}>
                  <div className="account-card-top">
                    <span className="account-icon">
                      <CardIcon size={19} />
                    </span>
                    <span className="status-pill">
                      {card.brand.toUpperCase()}
                    </span>
                  </div>
                  <p>
                    {card.bank}
                    {card.lastFour ? ` · •••• ${card.lastFour}` : ""}
                  </p>
                  <h2>{card.name}</h2>
                  <strong className="account-balance">
                    {formatMoney(debt, card.currency)}
                  </strong>
                  <small>
                    Cupo usado{" "}
                    {Math.round((Math.max(0, debt) / card.creditLimit) * 100)} %
                    · corte {card.closingDay} · pago {card.dueDay}
                  </small>
                  <p className="muted-copy">
                    Facturado{" "}
                    {formatMoney(card.statementBalance, card.currency)} · sin
                    facturar {formatMoney(card.unbilledBalance, card.currency)}
                  </p>
                  <button
                    className="button button-secondary button-compact"
                    type="button"
                    onClick={() => void reconcile(card)}
                  >
                    Conciliar extracto
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <section className="section-block">
        <div className="section-heading">
          <h2>Próximas cuotas</h2>
        </div>
        {data.installmentSchedules.filter((item) => item.status === "pending")
          .length === 0 ? (
          <p className="muted-copy">No hay cuotas pendientes.</p>
        ) : (
          data.installmentSchedules
            .filter((item) => item.status === "pending")
            .slice(0, 12)
            .map((item) => {
              const purchaseItem = data.installmentPurchases.find(
                (purchaseRecord) => purchaseRecord.id === item.purchaseId,
              );
              return (
                <article className="schedule-row" key={item.id}>
                  <div>
                    <strong>
                      {purchaseItem?.description ?? "Compra a cuotas"}
                    </strong>
                    <span>
                      Cuota {item.installmentNumber} de{" "}
                      {purchaseItem?.installmentCount ?? "—"} · vence{" "}
                      {item.dueDate}
                    </span>
                  </div>
                  <strong>
                    {formatMoney(
                      toMoneyAmount(item.principal + item.interest),
                      purchaseItem?.currency ?? currency!,
                    )}
                  </strong>
                  <button
                    className="button button-secondary button-compact"
                    type="button"
                    onClick={() => void markInstallment(item.id, item.revision)}
                  >
                    Marcar pagada
                  </button>
                </article>
              );
            })
        )}
      </section>
    </div>
  );
}
