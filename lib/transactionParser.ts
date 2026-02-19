export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "debit" | "credit";
}

const DATE_REGEX = /^\d{1,2}\/\d{1,2}$/;
const AMOUNT_REGEX = /^\d{1,3}(?:,\d{3})*\.\d{2}$/;

export function parseTransactions(tokens: string[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  let section: "debit" | "credit" | null = null;
  let i = 0;

  while (i < tokens.length) {
    const raw = tokens[i] || "";
    const token = raw.trim();
    const lower = token.toLowerCase();

    // Detect sections
    if (lower.includes("checks") && lower.includes("debits")) {
      section = "debit";
      i++;
      continue;
    }

    if (lower.includes("deposits") && lower.includes("credits")) {
      section = "credit";
      i++;
      continue;
    }

    // Detect date
    if (DATE_REGEX.test(token) && section) {
      const date = token;

      let descriptionParts: string[] = [];
      let amount: number | null = null;

      let j = i + 1;

      while (j < tokens.length) {
        const t = tokens[j]?.trim();

        if (!t) {
          j++;
          continue;
        }

        if (AMOUNT_REGEX.test(t)) {
          amount = parseFloat(t.replace(/,/g, ""));
          j++;
          break;
        }

        descriptionParts.push(t);
        j++;
      }

      // Optional extra line
      if (j < tokens.length) {
        const next = tokens[j]?.trim();

        if (next && !DATE_REGEX.test(next) && !AMOUNT_REGEX.test(next)) {
          descriptionParts.push(next);
          j++;
        }
      }

      if (amount !== null && descriptionParts.length > 0) {
        const signedAmount = section === "debit" ? -amount : amount;

        transactions.push({
          date,
          description: descriptionParts.join(" "),
          amount: signedAmount,
          type: section,
        });
      }

      i = j;
      continue;
    }

    i++;
  }

  return transactions;
}
