import assert from "node:assert/strict";
import { assembleScheduleC, buildFallbackScheduleC } from "@/lib/schedule-c";
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
assert.equal(result.excludedTransactions.length, 1);
assert.ok(result.excludedTransactions[0].includes("TRANSFER TO SAVINGS"));

console.log("schedule-c assemble tests passed");

// A transaction the AI didn't classify should fall back to the user's own
// category pick rather than a generic sign-based guess.
const txsWithHint: Transaction[] = [txs[0], { ...txs[1], category: "22" }, txs[2]];
const unclassified = assembleScheduleC(
  txsWithHint,
  {
    taxYear: 2025,
    classifications: [{ transactionId: "a", line: "1" }],
    notes: "",
  },
  "Demo LLC",
);
const officeLine = unclassified.lineItems.find((item) => item.line === "22");
assert.ok(officeLine, "expected office supplies line item to exist");

// The no-AI fallback path (e.g. missing OPENAI_API_KEY) should also honor
// user-assigned categories instead of only bucketing income/other-expenses.
const categorizedTxs: Transaction[] = [
  { ...txs[1], category: "22" },
  { ...txs[2], category: "exclude" },
];
const fallback = buildFallbackScheduleC(categorizedTxs, "Demo LLC", "fallback notes");
assert.equal(fallback.lineItems.length, 1);
assert.equal(fallback.lineItems[0].line, "22");
assert.equal(fallback.totalExpenses, 45.5);
assert.equal(fallback.excludedTransactions.length, 1);

console.log("schedule-c category-hint tests passed");
