export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  /** Optional user-assigned Schedule C line (or "exclude") — hints the AI classifier. */
  category?: string;
}

export interface ScheduleCLineItem {
  line: string;
  label: string;
  amount: number;
  transactions: string[];
}

export interface ScheduleCResult {
  businessName?: string;
  taxYear?: number;
  grossReceipts: number;
  totalExpenses: number;
  netProfit: number;
  lineItems: ScheduleCLineItem[];
  /** Transactions marked personal/transfer — excluded from Schedule C totals. */
  excludedTransactions: string[];
  notes: string;
}

export type AnalysisResultItem =
  | {
      type: "schedule_c";
      title: string;
      data: ScheduleCResult;
    };

export interface AnalysisResults {
  items: AnalysisResultItem[];
}
