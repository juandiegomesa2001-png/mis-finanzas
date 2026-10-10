import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { FinanceDatabase } from "../database/financeDatabase";
import {
  calculateAccountBalance,
  calculateExpenseTotal,
  toCurrency,
  toDomainDate,
  toMoneyAmount,
  toPositiveMoneyAmount,
  toUuid,
} from "../domain";
import { FinanceService } from "./financeService";
import { ObligationService } from "./obligationService";

const COP = toCurrency("COP");
const date = toDomainDate("2026-01-15");
const accountId = toUuid("90000000-0000-4000-8000-000000000001");
const cardId = toUuid("90000000-0000-4000-8000-000000000002");

describe("persistencia de obligaciones", () => {
  let db: FinanceDatabase;
  let finance: FinanceService;
  let service: ObligationService;
  beforeEach(async () => {
    db = new FinanceDatabase(`obligations-${crypto.randomUUID()}`);
    finance = new FinanceService(db);
    service = new ObligationService(db);
    await finance.initialize();
    await finance.createAccount({
      id: accountId,
      name: "Cuenta",
      type: "savings",
      currency: COP,
      initialBalance: toMoneyAmount(1_000_000),
      initialDate: toDomainDate("2026-01-01"),
    });
    await service.createCard({
      id: cardId,
      bank: "Banco",
      name: "Visa",
      brand: "visa",
      currency: COP,
      creditLimit: toPositiveMoneyAmount(2_000_000),
      openingDebt: toMoneyAmount(0),
      statementBalance: toMoneyAmount(0),
      unbilledBalance: toMoneyAmount(0),
      annualEffectiveRateBps: 2_500,
      closingDay: 20,
      dueDay: 28,
      minimumPayment: toMoneyAmount(20_000),
      totalPayment: toMoneyAmount(0),
      usualPaymentAccountId: accountId,
    });
  });
  afterEach(async () => {
    db.close();
    await db.delete();
  });
  async function expenseCategory() {
    const value = await db.categories.where("kind").equals("expense").first();
    if (!value) throw new Error("Falta categoría");
    return value;
  }

  it("guarda compra, gasto y cronograma en una sola transacción", async () => {
    const category = await expenseCategory();
    await service.createPurchase({
      cardId,
      categoryId: category.id,
      description: "Equipo",
      purchaseDate: date,
      amount: toPositiveMoneyAmount(300_000),
      installmentCount: 3,
    });
    expect(await db.installmentPurchases.count()).toBe(1);
    expect(await db.installmentSchedules.count()).toBe(3);
    expect(await db.transactions.where("type").equals("expense").count()).toBe(
      1,
    );
    expect(
      calculateExpenseTotal(
        await db.transactions.toArray(),
        { from: date, to: date },
        COP,
      ),
    ).toBe(300_000);
    expect(await service.cardDebt(cardId)).toBe(300_000);
  });
  it("revierte una compra duplicada sin dejar cuotas parciales", async () => {
    const category = await expenseCategory();
    const input = {
      id: toUuid("91000000-0000-4000-8000-000000000001"),
      transactionId: toUuid("91000000-0000-4000-8000-000000000002"),
      cardId,
      categoryId: category.id,
      description: "Compra",
      purchaseDate: date,
      amount: toPositiveMoneyAmount(100_000),
      installmentCount: 2,
    };
    await service.createPurchase(input);
    await expect(service.createPurchase(input)).rejects.toBeDefined();
    expect(await db.installmentPurchases.count()).toBe(1);
    expect(await db.installmentSchedules.count()).toBe(2);
    expect(await db.transactions.count()).toBe(1);
  });

  it("anula una compra sin borrarla y revierte la deuda y el gasto", async () => {
    const category = await expenseCategory();
    const purchase = await service.createPurchase({
      cardId,
      categoryId: category.id,
      description: "Compra anulable",
      purchaseDate: date,
      amount: toPositiveMoneyAmount(100_000),
      installmentCount: 2,
    });
    const movement = await db.transactions.get(purchase.transactionId);
    if (!movement) throw new Error("Falta movimiento");
    await finance.voidTransaction(movement.id, movement.revision, "Devolución total");
    expect((await db.installmentPurchases.get(purchase.id))?.status).toBe("voided");
    expect(await db.installmentPurchases.count()).toBe(1);
    expect(await db.transactions.count()).toBe(1);
    expect((await db.transactions.get(movement.id))?.status).toBe("voided");
    expect(await service.cardDebt(cardId)).toBe(0);
    expect(
      calculateExpenseTotal(
        await db.transactions.toArray(),
        { from: date, to: date },
        COP,
      ),
    ).toBe(0);
  });
  it("elimina fisicamente una tarjeta sin historial", async () => {
    const card = await db.creditCards.get(cardId);
    if (!card) throw new Error("Falta tarjeta");
    expect((await service.inspectCardRemoval(cardId)).canDelete).toBe(true);

    await service.deleteUnusedCard(cardId, card.revision);

    expect(await db.creditCards.get(cardId)).toBeUndefined();
  });

  it("impide eliminar una tarjeta con historial y permite archivarla", async () => {
    const category = await expenseCategory();
    await service.createPurchase({
      cardId,
      categoryId: category.id,
      description: "Compra conservada",
      purchaseDate: date,
      amount: toPositiveMoneyAmount(100_000),
      installmentCount: 1,
    });
    const card = await db.creditCards.get(cardId);
    if (!card) throw new Error("Falta tarjeta");
    expect((await service.inspectCardRemoval(cardId)).canDelete).toBe(false);

    await expect(service.deleteUnusedCard(cardId, card.revision)).rejects.toThrow(
      "no puede eliminarse",
    );
    const archived = await service.archiveCard(cardId, card.revision);

    expect(archived.status).toBe("archived");
    expect(await db.installmentPurchases.count()).toBe(1);
    expect(await db.transactions.count()).toBe(1);
  });

  it("un abono reduce efectivo y deuda sin crear gasto de consumo", async () => {
    await db.creditCards.update(cardId, {
      openingDebt: toMoneyAmount(200_000),
    });
    await service.recordCardEntry({
      cardId,
      type: "extra_payment",
      amount: toPositiveMoneyAmount(50_000),
      effectiveDate: date,
      paymentAccountId: accountId,
    });
    const transactions = await db.transactions.toArray();
    const account = await db.accounts.get(accountId);
    if (!account) throw new Error("Falta cuenta");
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.type).toBe("adjustment");
    expect(calculateAccountBalance(account, transactions)).toBe(950_000);
    expect(
      calculateExpenseTotal(transactions, { from: date, to: date }, COP),
    ).toBe(0);
    expect(await service.cardDebt(cardId)).toBe(150_000);
  });
  it("intereses y cargos son gastos y aumentan la deuda una vez", async () => {
    const category = await expenseCategory();
    await service.recordCardEntry({
      cardId,
      type: "interest",
      amount: toPositiveMoneyAmount(25_000),
      effectiveDate: date,
      categoryId: category.id,
    });
    expect(await service.cardDebt(cardId)).toBe(25_000);
    expect(
      calculateExpenseTotal(
        await db.transactions.toArray(),
        { from: date, to: date },
        COP,
      ),
    ).toBe(25_000);
  });
  it("paga una obligación una sola vez mediante control de revisión", async () => {
    const category = await expenseCategory();
    const obligation = await service.createObligation({
      name: "Internet",
      kind: "utility",
      categoryId: category.id,
      currency: COP,
      expectedAmount: toPositiveMoneyAmount(80_000),
      frequency: "monthly",
      nextDueDate: date,
      paymentAccountId: accountId,
    });
    await service.markObligationPaid(
      obligation.id,
      obligation.revision,
      accountId,
    );
    await expect(
      service.markObligationPaid(obligation.id, obligation.revision, accountId),
    ).rejects.toThrow("cambió");
    expect(await db.transactions.count()).toBe(1);
  });

  it("distingue valor previsto, facturado, pagado y siguiente ciclo", async () => {
    const category = await expenseCategory();
    const planned = await service.createObligation({
      name: "Energía",
      kind: "utility",
      categoryId: category.id,
      currency: COP,
      expectedAmount: toPositiveMoneyAmount(70_000),
      frequency: "monthly",
      nextDueDate: date,
      paymentAccountId: accountId,
    });
    const billed = await service.billObligation(
      planned.id,
      planned.revision,
      toPositiveMoneyAmount(75_000),
    );
    const paid = await service.markObligationPaid(
      billed.id,
      billed.revision,
      accountId,
    );
    const next = await service.advanceObligation(paid.id, paid.revision);
    expect(next.status).toBe("planned");
    expect(next.nextDueDate).toBe("2026-02-15");
    expect(next.billedAmount).toBeUndefined();
    expect((await db.transactions.toArray())[0]?.amount).toBe(75_000);
  });

  it("marca cuotas pagadas sin crear un segundo movimiento financiero", async () => {
    const category = await expenseCategory();
    const purchase = await service.createPurchase({
      cardId,
      categoryId: category.id,
      description: "Curso",
      purchaseDate: date,
      amount: toPositiveMoneyAmount(120_000),
      installmentCount: 2,
    });
    const installment = await db.installmentSchedules
      .where("purchaseId")
      .equals(purchase.id)
      .first();
    if (!installment) throw new Error("Falta cuota");
    await service.markInstallmentPaid(installment.id, installment.revision);
    expect((await db.installmentPurchases.get(purchase.id))?.paidInstallments).toBe(1);
    expect(await db.transactions.count()).toBe(1);
  });

  it("aporta a una meta con revisión y sin exceder el objetivo", async () => {
    const goal = await service.createSavingsGoal({
      name: "Reserva",
      currency: COP,
      targetAmount: toPositiveMoneyAmount(100_000),
      currentAmount: toMoneyAmount(80_000),
      priority: "high",
      plannedMonthlyContribution: toMoneyAmount(20_000),
      mode: "balanced",
    });
    const completed = await service.contributeToGoal(
      goal.id,
      goal.revision,
      toPositiveMoneyAmount(50_000),
    );
    expect(completed.currentAmount).toBe(100_000);
    expect(completed.status).toBe("completed");
    await expect(
      service.contributeToGoal(goal.id, goal.revision, toPositiveMoneyAmount(1)),
    ).rejects.toThrow("cambió");
  });
  it("genera recordatorios locales con fechas reales", async () => {
    const category = await expenseCategory();
    await service.createObligation({
      name: "Agua",
      kind: "utility",
      categoryId: category.id,
      currency: COP,
      expectedAmount: toPositiveMoneyAmount(50_000),
      frequency: "monthly",
      nextDueDate: toDomainDate("2026-01-17"),
    });
    const reminders = await service.refreshReminders(date);
    expect(reminders.some((item) => item.title.includes("Agua"))).toBe(true);
    expect(reminders.some((item) => item.kind === "card_closing")).toBe(true);
  });

  it("concilia un extracto conservando un historial versionado", async () => {
    const card = await db.creditCards.get(cardId);
    if (!card) throw new Error("Falta tarjeta");
    await service.reconcileStatement({
      cardId,
      expectedRevision: card.revision,
      periodEnd: date,
      dueDate: toDomainDate("2026-01-28"),
      statementBalance: toMoneyAmount(120_000),
      unbilledBalance: toMoneyAmount(30_000),
      minimumPayment: toMoneyAmount(20_000),
      totalPayment: toMoneyAmount(120_000),
    });
    expect(await db.cardStatements.count()).toBe(1);
    expect((await db.creditCards.get(cardId))?.revision).toBe(2);
    expect((await db.creditCards.get(cardId))?.statementBalance).toBe(120_000);
  });
});

describe("migración Dexie no destructiva", () => {
  it("conserva registros de la versión 1 al abrir la versión 2", async () => {
    const name = `migration-${crypto.randomUUID()}`;
    const legacy = new Dexie(name);
    legacy
      .version(1)
      .stores({
        accounts: "&id,status,type,currency,initialDate,updatedAt",
        categories: "&id,&systemKey,[kind+status],name,updatedAt",
        transactions:
          "&id,type,status,effectiveDate,currency,sourceAccountId,destinationAccountId,accountId,categoryId,[type+status+effectiveDate],[sourceAccountId+status+effectiveDate],[destinationAccountId+status+effectiveDate],updatedAt",
        settings: "&id,&key,updatedAt",
        incomeSchedules:
          "&id,&key,status,nextEstimatedDate,destinationAccountId,updatedAt",
      });
    await legacy.table("accounts").add({ id: accountId, name: "Legado" });
    legacy.close();
    const upgraded = new FinanceDatabase(name);
    expect((await upgraded.accounts.get(accountId))?.name).toBe("Legado");
    expect(upgraded.tables.some((table) => table.name === "creditCards")).toBe(
      true,
    );
    upgraded.close();
    await upgraded.delete();
  });
});
