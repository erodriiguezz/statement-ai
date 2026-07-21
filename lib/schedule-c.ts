import {
  EXCLUDE_LINE,
  SCHEDULE_C_LINE_MAP,
  SCHEDULE_C_LINES,
  isAllowedClassificationLine,
} from "@/lib/schedule-c-lines";
import type { ScheduleCLineItem, ScheduleCResult, Transaction } from "@/lib/types";

interface AiClassification {
  transactionId: string;
  line: string;
  reason?: string;
}

interface AiClassificationResponse {
  taxYear?: number | null;
  classifications?: AiClassification[];
  notes?: string;
}

const LINE_CATALOG_FOR_PROMPT = SCHEDULE_C_LINES.map(
  (item) => `${item.line}: ${item.label} (${item.kind})`,
).join("\n");

const SCHEDULE_C_SYSTEM_PROMPT = `You are a tax preparation assistant helping map verified bank/credit-card transactions to IRS Schedule C (Form 1040).

You classify transactions. You do NOT compute final totals — the server will aggregate from your classifications.

Allowed Schedule C lines:
${LINE_CATALOG_FOR_PROMPT}
${EXCLUDE_LINE}: Non-business / transfers / owner draws / credit-card payments / loan principal / personal (exclude from Schedule C)

Rules:
- Use only provided transaction ids. Do not invent transactions or amounts.
- Classify EVERY transaction exactly once.
- Positive amounts are usually income (prefer line 1, or 6 for atypical income). Returns/refunds of sales may use line 2.
- Negative amounts are usually business expenses — choose the best expense line; use 27a only when unsure.
- Exclude transfers between own accounts, Zelle/Venmo to self, credit card payment transfers, owner draws, personal spending, loan principal payments, and ATM cash that is not a business expense.
- Prefer conservative exclusions when a description looks like an internal transfer.
- Infer taxYear from the transaction dates (most common calendar year).

Return valid JSON only:
{
  "taxYear": number | null,
  "classifications": [
    { "transactionId": string, "line": string, "reason": string }
  ],
  "notes": string
}`;

export async function generateScheduleC(
  transactions: Transaction[],
  businessName?: string,
): Promise<ScheduleCResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return buildFallbackScheduleC(
      transactions,
      businessName,
      "Generated with local fallback logic. Set OPENAI_API_KEY for AI-assisted Schedule C categorization.",
    );
  }

  try {
    const ai = await classifyTransactionsWithOpenAI(transactions, businessName, apiKey);
    return assembleScheduleC(transactions, ai, businessName);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Unknown AI classification error.";
    return buildFallbackScheduleC(
      transactions,
      businessName,
      `AI classification failed (${detail}). Showing local fallback totals — review and categorize manually.`,
    );
  }
}

const MAX_OPENAI_ATTEMPTS = 4;

async function classifyTransactionsWithOpenAI(
  transactions: Transaction[],
  businessName: string | undefined,
  apiKey: string,
): Promise<AiClassificationResponse> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const orgId = process.env.OPENAI_ORG_ID?.trim();
  if (orgId) {
    headers["OpenAI-Organization"] = orgId;
  }

  const projectId = process.env.OPENAI_PROJECT_ID?.trim();
  if (projectId) {
    headers["OpenAI-Project"] = projectId;
  }

  const body = JSON.stringify({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SCHEDULE_C_SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify({
          businessName: businessName ?? null,
          transactions: transactions.map((tx) => ({
            id: tx.id,
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
          })),
        }),
      },
    ],
  });

  let lastError = "OpenAI request failed.";

  for (let attempt = 1; attempt <= MAX_OPENAI_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers,
        body,
      });

      if (response.status === 429) {
        const errorText = await response.text();
        lastError = formatOpenAiError(429, errorText);

        // Quota exceeded will not recover by waiting — fail fast.
        if (/insufficient_quota|exceeded your current quota/i.test(errorText)) {
          throw new Error(lastError);
        }

        if (attempt === MAX_OPENAI_ATTEMPTS) {
          throw new Error(lastError);
        }

        await sleep(retryDelayMs(response, attempt));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(formatOpenAiError(response.status, errorText));
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty model response.");
      }

      return JSON.parse(content) as AiClassificationResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        lastError = "OpenAI request timed out.";
        if (attempt === MAX_OPENAI_ATTEMPTS) {
          throw new Error(lastError);
        }
        await sleep(retryDelayMs(null, attempt));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(lastError);
}

function formatOpenAiError(status: number, errorText: string): string {
  const trimmed = errorText.replace(/\s+/g, " ").slice(0, 280);
  if (status === 429 && /insufficient_quota|exceeded your current quota/i.test(errorText)) {
    return `OpenAI quota exceeded for this API key (billing/credits). ${trimmed}`;
  }
  if (status === 429) {
    return `OpenAI rate limit hit — retrying paced requests. ${trimmed}`;
  }
  return `OpenAI ${status}: ${trimmed}`;
}

function retryDelayMs(response: Response | null, attempt: number): number {
  const retryAfter = response?.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number.parseFloat(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(30_000, Math.max(500, seconds * 1000));
    }
  }

  // Exponential backoff: ~1s, 2s, 4s (+ jitter)
  const base = Math.min(8_000, 1000 * 2 ** (attempt - 1));
  const jitter = Math.floor(Math.random() * 400);
  return base + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function assembleScheduleC(
  transactions: Transaction[],
  ai: AiClassificationResponse,
  businessName?: string,
): ScheduleCResult {
  const byId = new Map(transactions.map((tx) => [tx.id, tx]));
  const classified = new Map<string, string>();

  for (const item of ai.classifications ?? []) {
    if (!item?.transactionId || !byId.has(item.transactionId)) {
      continue;
    }
    const line = String(item.line ?? "").trim();
    if (!isAllowedClassificationLine(line)) {
      classified.set(item.transactionId, "27a");
      continue;
    }
    classified.set(item.transactionId, line);
  }

  // Any missing classification defaults by sign
  for (const tx of transactions) {
    if (!classified.has(tx.id)) {
      if (tx.amount > 0) {
        classified.set(tx.id, "1");
      } else if (tx.amount < 0) {
        classified.set(tx.id, "27a");
      } else {
        classified.set(tx.id, EXCLUDE_LINE);
      }
    }
  }

  const buckets = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const line = classified.get(tx.id) ?? EXCLUDE_LINE;
    if (line === EXCLUDE_LINE || tx.amount === 0) {
      continue;
    }

    const def = SCHEDULE_C_LINE_MAP.get(line);
    if (!def) {
      continue;
    }

    // Keep income/expense consistent with amount sign
    if (def.kind === "income" && tx.amount <= 0) {
      pushBucket(buckets, "27a", tx);
      continue;
    }
    if (def.kind === "expense" && tx.amount >= 0) {
      pushBucket(buckets, "6", tx);
      continue;
    }

    pushBucket(buckets, line, tx);
  }

  const lineItems: ScheduleCLineItem[] = [];
  let grossReceipts = 0;
  let totalExpenses = 0;

  const orderedLines = [
    ...SCHEDULE_C_LINES.filter((l) => l.kind === "income").map((l) => l.line),
    ...SCHEDULE_C_LINES.filter((l) => l.kind === "expense").map((l) => l.line),
  ];

  for (const line of orderedLines) {
    const txs = buckets.get(line);
    if (!txs?.length) {
      continue;
    }
    const def = SCHEDULE_C_LINE_MAP.get(line);
    if (!def) {
      continue;
    }

    const amount =
      def.kind === "income"
        ? round2(txs.reduce((sum, tx) => sum + tx.amount, 0))
        : round2(txs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0));

    if (amount === 0) {
      continue;
    }

    if (def.kind === "income") {
      grossReceipts = round2(grossReceipts + amount);
    } else {
      totalExpenses = round2(totalExpenses + amount);
    }

    lineItems.push({
      line,
      label: def.label,
      amount,
      transactions: txs.map(formatTransactionRef),
    });
  }

  const excludedCount = [...classified.values()].filter(
    (line) => line === EXCLUDE_LINE,
  ).length;

  const noteParts = [
    ai.notes?.trim(),
    excludedCount > 0
      ? `${excludedCount} transaction(s) excluded as transfers/personal/non-Schedule-C.`
      : null,
    "Draft only — review categorizations before filing.",
  ].filter(Boolean);

  return {
    businessName: businessName?.trim() || undefined,
    taxYear: resolveTaxYear(transactions, ai.taxYear),
    grossReceipts,
    totalExpenses,
    netProfit: round2(grossReceipts - totalExpenses),
    lineItems,
    notes: noteParts.join(" "),
  };
}

function pushBucket(
  buckets: Map<string, Transaction[]>,
  line: string,
  tx: Transaction,
) {
  const existing = buckets.get(line);
  if (existing) {
    existing.push(tx);
    return;
  }
  buckets.set(line, [tx]);
}

function buildFallbackScheduleC(
  transactions: Transaction[],
  businessName: string | undefined,
  notes: string,
): ScheduleCResult {
  const income = transactions.filter((tx) => tx.amount > 0);
  const expenses = transactions.filter((tx) => tx.amount < 0);

  const grossReceipts = round2(income.reduce((sum, tx) => sum + tx.amount, 0));
  const totalExpenses = round2(
    expenses.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
  );

  const lineItems: ScheduleCLineItem[] = [];

  if (grossReceipts > 0) {
    lineItems.push({
      line: "1",
      label: "Gross receipts or sales",
      amount: grossReceipts,
      transactions: income.map(formatTransactionRef),
    });
  }

  if (totalExpenses > 0) {
    lineItems.push({
      line: "27a",
      label: "Other expenses",
      amount: totalExpenses,
      transactions: expenses.map(formatTransactionRef),
    });
  }

  return {
    businessName: businessName?.trim() || undefined,
    taxYear: resolveTaxYear(transactions, null),
    grossReceipts,
    totalExpenses,
    netProfit: round2(grossReceipts - totalExpenses),
    lineItems,
    notes,
  };
}

function resolveTaxYear(
  transactions: Transaction[],
  aiYear: number | null | undefined,
): number {
  if (
    typeof aiYear === "number" &&
    Number.isInteger(aiYear) &&
    aiYear >= 2000 &&
    aiYear <= 2100
  ) {
    return aiYear;
  }

  const years = transactions
    .map((tx) => Number.parseInt(tx.date.slice(0, 4), 10))
    .filter((year) => Number.isFinite(year));

  if (years.length === 0) {
    return new Date().getFullYear() - 1;
  }

  const counts = new Map<number, number>();
  for (const year of years) {
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function formatTransactionRef(tx: Transaction): string {
  return `${tx.date} | ${tx.description} | ${tx.amount.toFixed(2)}`;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
