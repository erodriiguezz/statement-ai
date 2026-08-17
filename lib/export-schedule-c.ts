import ExcelJS from "exceljs";

import { parseTransactionRef } from "@/lib/transaction-ref";
import type { ScheduleCResult } from "@/lib/types";

function buildFilename(data: ScheduleCResult): string {
  const business = data.businessName?.trim().replace(/[^\w-]+/g, "_") || "schedule-c";
  const year = data.taxYear ?? new Date().getFullYear();
  return `${business}-${year}-draft.xlsx`;
}

/**
 * Builds a Schedule C draft workbook (summary, line items, and a
 * transaction-level breakdown) and triggers a browser download.
 */
export async function exportScheduleCToXlsx(data: ScheduleCResult): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Statement.AI";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 22 },
    { header: "Value", key: "value", width: 40 },
  ];
  summary.addRows([
    { field: "Business name", value: data.businessName ?? "" },
    { field: "Tax year", value: data.taxYear ?? "" },
    { field: "Gross receipts", value: data.grossReceipts },
    { field: "Total expenses", value: data.totalExpenses },
    { field: "Net profit", value: data.netProfit },
    { field: "Notes", value: data.notes },
  ]);
  summary.getRow(1).font = { bold: true };

  const lines = workbook.addWorksheet("Schedule C Lines");
  lines.columns = [
    { header: "Line", key: "line", width: 8 },
    { header: "Category", key: "label", width: 36 },
    { header: "Amount", key: "amount", width: 16 },
  ];
  lines.getRow(1).font = { bold: true };
  for (const item of data.lineItems) {
    lines.addRow({ line: item.line, label: item.label, amount: item.amount });
  }
  lines.getColumn("amount").numFmt = "$#,##0.00";

  const transactions = workbook.addWorksheet("Transactions");
  transactions.columns = [
    { header: "Line", key: "line", width: 8 },
    { header: "Category", key: "label", width: 36 },
    { header: "Date", key: "date", width: 14 },
    { header: "Description", key: "description", width: 48 },
    { header: "Amount", key: "amount", width: 16 },
  ];
  transactions.getRow(1).font = { bold: true };
  for (const item of data.lineItems) {
    for (const ref of item.transactions) {
      const { date, description, amount } = parseTransactionRef(ref);
      transactions.addRow({ line: item.line, label: item.label, date, description, amount });
    }
  }
  transactions.getColumn("amount").numFmt = "$#,##0.00";

  const excluded = workbook.addWorksheet("Personal (Excluded)");
  excluded.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Description", key: "description", width: 48 },
    { header: "Amount", key: "amount", width: 16 },
  ];
  excluded.getRow(1).font = { bold: true };
  for (const ref of data.excludedTransactions) {
    const { date, description, amount } = parseTransactionRef(ref);
    excluded.addRow({ date, description, amount });
  }
  excluded.getColumn("amount").numFmt = "$#,##0.00";

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildFilename(data);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
