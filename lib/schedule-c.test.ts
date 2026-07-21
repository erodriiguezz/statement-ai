import assert from "node:assert/strict";
import { assembleScheduleC } from "@/lib/schedule-c";
import type { Transaction } from "@/lib/types";

const txs: Transaction[] = [
  {
    id: "a",
    date: "2025-01-05",
    description: "CLIENT PAYMENT",
    amount: 1200,
  },
  {
    id: "b",
    date: "2025-01-08",
    description: "OFFICE DEPOT SUPPLIES",
    amount: -45.5,
  },
  {
    id: "c",
    date: "2025-01-09",
    description: "TRANSFER TO SAVINGS",
    amount: -300,
  },
];

const result = assembleScheduleC(
  txs,
  {
    taxYear: 2025,
    classifications: [
      { transactionId: "a", line: "1" },
      { transactionId: "b", line: "22" },
      { transactionId: "c", line: "exclude" },
    ],
    notes: "Test assemble",
  },
  "Demo LLC",
);

assert.equal(result.taxYear, 2025);
assert.equal(result.businessName, "Demo LLC");
assert.equal(result.grossReceipts, 1200);
assert.equal(result.totalExpenses, 45.5);
assert.equal(result.netProfit, 1154.5);
assert.equal(result.lineItems.length, 2);
assert.ok(result.notes.includes("excluded"));

console.log("schedule-c assemble tests passed");
