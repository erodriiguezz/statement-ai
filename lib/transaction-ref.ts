import type { Transaction } from "@/lib/types";

/**
 * Serializes a transaction into the "date | description | amount" ref
 * format used by Schedule C line items and excluded-transaction lists.
 */
export function formatTransactionRef(tx: Transaction): string {
  return `${tx.date} | ${tx.description} | ${tx.amount.toFixed(2)}`;
}

/** Splits a "date | description | amount" ref back into its parts. */
export function parseTransactionRef(ref: string): {
  date: string;
  description: string;
  amount: number;
} {
  const [date = "", description = "", amountText = ""] = ref
    .split(" | ")
    .map((part) => part.trim());
  const amount = Number.parseFloat(amountText);
  return { date, description, amount: Number.isFinite(amount) ? amount : 0 };
}
