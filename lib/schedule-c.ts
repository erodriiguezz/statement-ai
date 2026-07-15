import type { ScheduleCResult, Transaction } from "@/lib/types";

const SCHEDULE_C_SYSTEM_PROMPT = `You are a tax preparation assistant helping an accountant map verified bank transactions to IRS Schedule C (Profit or Loss From Business).

Rules:
- Use only the provided transactions. Do not invent amounts or line items.
- Positive amounts are generally income (gross receipts). Negative amounts are generally expenses (use absolute values for expense line items).
- Map each expense to the most appropriate Schedule C line when possible.
- If a transaction cannot be categorized confidently, group it under line "27a" (Other expenses).
- Return valid JSON only, matching this schema:
{
  "businessName": string | null,
  "taxYear": number | null,
  "grossReceipts": number,
  "totalExpenses": number,
  "netProfit": number,
  "lineItems": [
    {
      "line": string,
      "label": string,
      "amount": number,
      "transactions": string[]
    }
  ],
  "notes": string
}`;

export async function generateScheduleC(
  transactions: Transaction[],
  businessName?: string,
): Promise<ScheduleCResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildFallbackScheduleC(transactions, businessName);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SCHEDULE_C_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            businessName: businessName ?? null,
            transactions,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI service error: ${errorText}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI service returned an empty response.");
  }

  return JSON.parse(content) as ScheduleCResult;
}

function buildFallbackScheduleC(
  transactions: Transaction[],
  businessName?: string,
): ScheduleCResult {
  const income = transactions.filter((tx) => tx.amount > 0);
  const expenses = transactions.filter((tx) => tx.amount < 0);

  const grossReceipts = income.reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpenses = expenses.reduce(
    (sum, tx) => sum + Math.abs(tx.amount),
    0,
  );

  const lineItems: ScheduleCResult["lineItems"] = [];

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
    businessName,
    taxYear: new Date().getFullYear() - 1,
    grossReceipts,
    totalExpenses,
    netProfit: grossReceipts - totalExpenses,
    lineItems,
    notes:
      "Generated with local fallback logic. Set OPENAI_API_KEY for AI-assisted Schedule C categorization.",
  };
}

function formatTransactionRef(tx: Transaction): string {
  return `${tx.date} | ${tx.description} | ${tx.amount.toFixed(2)}`;
}
