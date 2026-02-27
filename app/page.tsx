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
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl bg-white shadow-xl rounded-2xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800">Statement AI</h1>
          <p className="text-gray-500 text-sm mt-1">
            Upload one or more bank statements to classify transactions.
          </p>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition">
          <input
            type="file"
            accept="application/pdf"
            multiple
            className="block w-full text-sm text-gray-600
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-medium
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100"
            onChange={(e) => {
              if (e.target.files) {
                setFiles(Array.from(e.target.files));
              }
            }}
          />
          <p className="text-xs text-gray-400 mt-2">
            PDF only • Multiple files supported
          </p>
        </div>

        {/* Submit */}
        <button
          onClick={handleUpload}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium
                     hover:bg-blue-700 active:scale-[0.98] transition"
        >
          Submit
        </button>

        {/* Loading */}
        {loading && (
          <div className="text-center text-gray-500">
            Processing statements...
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="bg-gray-100 text-gray-900 rounded-xl p-4 overflow-auto max-h-96">
            <pre className="text-xs">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );

  // return (
  //   <main style={{ padding: 40 }}>
  //     <h1>Schedule C Generator</h1>

  //     <input
  //       type="file"
  //       accept="application/pdf"
  //       multiple
  //       onChange={(e) => {
  //         if (e.target.files) {
  //           setFiles(Array.from(e.target.files));
  //         }
  //       }}
  //     />

  //     <button onClick={handleUpload}>Submit</button>

  //     {loading && <p>Processing...</p>}

  //     {result && (
  //       <pre style={{ marginTop: 20 }}>{JSON.stringify(result, null, 2)}</pre>
  //     )}
  //   </main>
  // );
}
