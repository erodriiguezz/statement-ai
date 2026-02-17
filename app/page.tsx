"use client";

import { useState } from "react";

export default function Home() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: any) {
    const file = e.target.files[0];

    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    setLoading(true);

    const res = await fetch("/api/process-statement", {
      method: "POST",
      body: form,
    });

    const data = await res.json();

    setResult(data);
    setLoading(false);
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Schedule C Generator</h1>

      <input type="file" onChange={handleUpload} />

      {loading && <p>Processing...</p>}

      {result && (
        <pre style={{ marginTop: 20 }}>{JSON.stringify(result, null, 2)}</pre>
      )}
    </main>
  );
}
