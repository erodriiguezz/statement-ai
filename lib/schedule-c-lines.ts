/** Common IRS Schedule C lines used for SMB bank-statement drafts. */

export interface ScheduleCLineDef {
  line: string;
  label: string;
  kind: "income" | "expense";
}

export const SCHEDULE_C_LINES: ScheduleCLineDef[] = [
  { line: "1", label: "Gross receipts or sales", kind: "income" },
  { line: "2", label: "Returns and allowances", kind: "income" },
  { line: "6", label: "Other income", kind: "income" },
  { line: "8", label: "Advertising", kind: "expense" },
  { line: "9", label: "Car and truck expenses", kind: "expense" },
  { line: "10", label: "Commissions and fees", kind: "expense" },
  { line: "11", label: "Contract labor", kind: "expense" },
  { line: "13", label: "Depreciation and section 179", kind: "expense" },
  { line: "15", label: "Insurance (other than health)", kind: "expense" },
  { line: "16a", label: "Interest (mortgage)", kind: "expense" },
  { line: "16b", label: "Interest (other)", kind: "expense" },
  { line: "17", label: "Legal and professional services", kind: "expense" },
  { line: "18", label: "Office expense", kind: "expense" },
  { line: "20a", label: "Rent or lease (vehicles/machinery)", kind: "expense" },
  { line: "20b", label: "Rent or lease (other business property)", kind: "expense" },
  { line: "21", label: "Repairs and maintenance", kind: "expense" },
  { line: "22", label: "Supplies", kind: "expense" },
  { line: "23", label: "Taxes and licenses", kind: "expense" },
  { line: "24a", label: "Travel", kind: "expense" },
  { line: "24b", label: "Deductible meals", kind: "expense" },
  { line: "25", label: "Utilities", kind: "expense" },
  { line: "26", label: "Wages", kind: "expense" },
  { line: "27a", label: "Other expenses", kind: "expense" },
];

export const SCHEDULE_C_LINE_MAP = new Map(
  SCHEDULE_C_LINES.map((item) => [item.line, item]),
);

export const EXCLUDE_LINE = "exclude";

export function isAllowedClassificationLine(line: string): boolean {
  return line === EXCLUDE_LINE || SCHEDULE_C_LINE_MAP.has(line);
}
