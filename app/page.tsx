"use client";

import { useState } from "react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!files.length) return;

    setLoading(true);

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("pdfs", file);
    });

    const res = await fetch("/api/process-statement", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <main style={{ padding: 40 }}>
      <h1>Schedule C Generator</h1>

      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          if (e.target.files) {
            setFiles(Array.from(e.target.files));
          }
        }}
      />

      <button onClick={handleUpload}>Submit</button>

      {loading && <p>Processing...</p>}

      {result && (
        <pre style={{ marginTop: 20 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  );
}
