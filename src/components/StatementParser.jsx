import { useState } from "react";
import extractText from "../lib/pdf/extractText";
import extractTransactions from "../lib/pdf/extractTransactions";
import normalizeTransaction from "../lib/pdf/normalize";

export default function StatementParser() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleExtract() {
    if (!file) return;

    setLoading(true);

    try {
      const pages = await extractText(file);
      const raw = extractTransactions(pages);
      const clean = raw.map(normalizeTransaction);

      console.log("Clean transactions:", clean);
    } catch (err) {
      console.error("Extraction failed", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <button onClick={handleExtract} disabled={!file || loading}>
        {loading ? "Processing..." : "Extract Transactions"}
      </button>
    </div>
  );
}
