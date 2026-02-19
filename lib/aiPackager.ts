import { normalizeMerchant } from "./merchantNormalizer";
import { classifyMerchant } from "./classifier";

export interface Transaction {
  date: string;
  description: string;
  amount: number;
}

export interface PackagedTransaction {
  merchant: string;
  totalAmount: number;
  transactionCount: number;
  suggestedCategory: string;
}

export function packageForAI(
  transactions: Transaction[],
): PackagedTransaction[] {
  const grouped: Record<string, PackagedTransaction> = {};

  for (const tx of transactions) {
    const merchant = normalizeMerchant(tx.description);
    const category = classifyMerchant(merchant);

    if (!grouped[merchant]) {
      grouped[merchant] = {
        merchant,
        totalAmount: 0,
        transactionCount: 0,
        suggestedCategory: category,
      };
    }

    grouped[merchant].totalAmount += Math.abs(tx.amount);
    grouped[merchant].transactionCount += 1;
  }

  return Object.values(grouped);
}
