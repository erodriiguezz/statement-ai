import { Ledger } from "@/types/transaction";

export function summarizeLedger(ledger: Ledger) {
  const income = ledger.transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = ledger.transactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const startDate = ledger.transactions[0]?.date;
  const endDate = ledger.transactions[ledger.transactions.length - 1]?.date;

  return {
    period: startDate && endDate ? `${startDate} → ${endDate}` : null,
    opening_balance: ledger.openingBalance,
    closing_balance: ledger.closingBalance,
    income_total: Number(income.toFixed(2)),
    expense_total: Number(expenses.toFixed(2)),
    transaction_count: ledger.transactions.length,
    warnings: ledger.warnings,
  };
}
