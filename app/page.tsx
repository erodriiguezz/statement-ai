"use client";

import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <form action="" className="space-y-8">
          <div>
            <label className="block text-sm font-medium mb-2">
              Upload PDF Statements
            </label>
            <input
              type="file"
              name="file"
              accept="application/pdf"
              multiple
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-900 file:text-white hover:file:bg-gray-800 file:cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-2">
              Multiple PDFs supported. Files are processed temporarily and
              deleted after summary generation.
            </p>
          </div>

          <button
            type="submit"
            className="inline-block w-auto bg-gray-900 text-white py-3 px-3 rounded-lg font-medium hover:bg-gray-800 transition cursor-pointer"
          >
            Process Statements
          </button>
        </form>
      </main>
    </div>
  );
}
