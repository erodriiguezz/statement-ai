import { Transaction } from "@/types/transaction";

const dateRegex = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/;

function normalizeDate(input: string): string {
  const parts = input.split("/");
  const year =
    parts.length === 3
      ? parts[2].length === 2
        ? `20${parts[2]}`
        : parts[2]
      : new Date().getFullYear().toString();

  return `${year}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
}

export function detectTransactionLines(lines: string[]): Transaction[] {
  const txns: Transaction[] = [];
  let current: Transaction | null = null;

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);

    if (dateMatch) {
      if (current) txns.push(current);

      current = {
        date: normalizeDate(dateMatch[1]),
        description: line.replace(dateRegex, "").trim(),
        raw: line,
        amount: 0,
        confidence: 0.7,
      };
    } else if (current) {
      current.description += " " + line;
      current.raw += "\n" + line;
      current.confidence -= 0.1;
    }
  }

  if (current) txns.push(current);
  return txns;
}
