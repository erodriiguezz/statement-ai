import { Transaction } from "@/types/transaction";

export function parseTransactions(rows: string[]): Transaction[] {
  const transactions: Transaction[] = [];

  const regex = /(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?\d+\.\d{2})/;

  for (const row of rows) {
    const match = row.match(regex);

    if (match) {
      const amount = parseFloat(match[3].replace("$", ""));

      transactions.push({
        date: match[1],
        description: match[2],
        amount,
        type: amount < 0 ? "debit" : "credit",
      });
    }
  }

  return transactions;
}
