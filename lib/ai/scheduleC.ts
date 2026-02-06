import { Ledger } from "@/types/transaction";

export async function generateScheduleC(ledger: Ledger) {
  // Replace this with your OpenAI / agent call
  return {
    gross_receipts: ledger.transactions
      .filter((t) => t.amount > 0)
      .reduce((a, b) => a + b.amount, 0),

    expenses_total: Math.abs(
      ledger.transactions
        .filter((t) => t.amount < 0)
        .reduce((a, b) => a + b.amount, 0),
    ),

    uncategorized: ledger.transactions.filter((t) => t.confidence < 0.5),
  };
}
