export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
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
