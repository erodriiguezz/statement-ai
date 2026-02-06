"use client";

import { useState } from "react";

export default function UploadPage() {
  const [result, setResult] = useState<any>(null);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = (e.currentTarget.file as HTMLInputElement).files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/statement", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("API ERROR:", text);
      throw new Error("Statement upload failed");
    }

    const data = await res.json();
    console.log(data);
  }

  return (
    <div style={{ padding: 40 }}>
      <form onSubmit={handleUpload}>
        <input type="file" name="file" accept="application/pdf" />
        <button type="submit">Upload</button>
      </form>

      <pre>{JSON.stringify(result, null, 2)}</pre>
    </div>
  );
}
