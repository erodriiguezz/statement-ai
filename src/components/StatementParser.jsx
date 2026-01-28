import { useState } from "react";
import extractText from "../lib/pdf/extractText";

export default function StatementParser() {
  const [file, setFile] = useState(null);

  async function handleExtract() {
    if (!file) return;
    try {
      const pages = await extractText(file);
      console.log("Pages extracted:", pages);
    } catch (err) {
      console.error("Extraction failed", err);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleExtract}>Extract Text</button>
    </div>
  );
}
