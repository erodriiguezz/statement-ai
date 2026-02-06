import { Transaction } from "@/types/transaction";

const amountRegex = /-?\$?\d{1,3}(?:,\d{3})*\.\d{2}/g;

export function parseAmounts(txn: Transaction): Transaction {
  const matches = txn.raw.match(amountRegex);

  if (!matches || matches.length === 0) {
    txn.confidence = Math.min(txn.confidence, 0.3);
    return txn;
  }

  const values = matches.map((v) => Number(v.replace(/[$,]/g, "")));

  txn.amount = values.length > 1 ? values[values.length - 2] : values[0];

  txn.balance = values.length > 1 ? values[values.length - 1] : undefined;

  return txn;
}
