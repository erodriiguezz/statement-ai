export default function extractTransactions(pages) {
  const transactions = [];

  const rowRegex = /(\d{2}\/\d{2})\s+(.+?)\s+(-?\$?\d+[.,]\d{2})/g;

  pages.forEach((page) => {
    let match;
    while ((match = rowRegex.exec(page)) !== null) {
      transactions.push({
        date: match[1],
        description: match[2].trim(),
        amount: parseFloat(match[3].replace(/[$,]/g, "")),
      });
    }
  });

  return transactions;
}
