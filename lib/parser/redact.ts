import { Ledger } from "@/types/transaction";

export function redactLedger(ledger: Ledger): Ledger {
  ledger.transactions = ledger.transactions.map((txn) => ({
    ...txn,
    description: txn.description
      .replace(/\b\d{6,}\b/g, "[REDACTED]")
      .replace(/\b(ACH|WIRE|ZELLE).*/i, "[REDACTED]"),
  }));

  return ledger;
}
