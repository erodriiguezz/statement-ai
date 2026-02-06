import { Transaction } from "@/types/transaction";
import { detectTransactionLines } from "./lineDetector";
import { parseAmounts } from "./amounts";

export function parseTransactions(lines: string[]): Transaction[] {
  const detected = detectTransactionLines(lines);

  return detected.map((txn) => {
    const parsed = parseAmounts(txn);

    // Fallback confidence guard
    if (!parsed.amount) {
      parsed.confidence = Math.min(parsed.confidence, 0.4);
    }

    return parsed;
  });
}
