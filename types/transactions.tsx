export type Transaction = {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // signed
  balance?: number;
  raw: string;
  confidence: number;
};

export type Ledger = {
  openingBalance?: number;
  closingBalance?: number;
  transactions: Transaction[];
  warnings: string[];
};
