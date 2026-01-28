export default function normalize(tx) {
  return {
    id: crypto.randomUUID(),
    date: normalizeDate(tx.date),
    description: sanitizeDescription(tx.description),
    amount: tx.amount,
    direction: tx.amount < 0 ? "debit" : "credit",
  };
}

// function sanitizeDescription(desc) {
//   return desc
//     .replace(/\b\d{8,}\b/g, "") // long numbers
//     .replace(/ACCT|ACCOUNT|ROUTING/gi, "")
//     .replace(/\s+/g, " ")
//     .trim();
// }
