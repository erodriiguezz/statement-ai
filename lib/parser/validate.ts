import { Ledger, Transaction } from "@/types/transaction";

export function validateLedger(transactions: Transaction[]): Ledger {
  const warnings: string[] = [];

  for (let i = 1; i < transactions.length; i++) {
    const prev = transactions[i - 1];
    const curr = transactions[i];

    if (prev.balance !== undefined && curr.balance !== undefined) {
      const expected = prev.balance + curr.amount;
      if (Math.abs(expected - curr.balance) > 0.02) {
        curr.confidence -= 0.3;
        warnings.push(`Balance mismatch on ${curr.date}`);
      }
    }
  }

  return {
    openingBalance: transactions[0]?.balance,
    closingBalance: transactions[transactions.length - 1]?.balance,
    transactions,
    warnings,
  };
}
