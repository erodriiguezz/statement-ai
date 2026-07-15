"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import type { Transaction } from "@/lib/types";

interface UploadStepProps {
  onComplete: (transactions: Transaction[]) => void;
}

export default function UploadStep({ onComplete }: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [consent, setConsent] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadEnabled = consent && !isUploading;

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );

    if (fileArray.length === 0) {
      setError("Please upload at least one PDF bank statement.");
      return;
    }

    if (!consent) {
      setError("You must authorize temporary processing before uploading.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      fileArray.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/parse", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        transactions?: Transaction[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to parse statements.");
      }

      onComplete(payload.transactions ?? []);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to parse statements.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (!uploadEnabled) {
      return;
    }

    if (event.dataTransfer.files.length > 0) {
      void uploadFiles(event.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Turn Statements into Tax Forms</h2>
        <p className="text-xl text-gray-600">
          Upload bank or credit card statement PDFs. We extract transactions for
          your review, then generate an IRS Schedule C draft.
        </p>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 cursor-pointer"
        />
        <span>
          I authorize the temporary processing of my documents for Schedule C
          preparation. Files are parsed locally and not retained after processing.
        </span>
      </label>

      <div
        onDragOver={(event) => {
          if (!uploadEnabled) {
            return;
          }
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (uploadEnabled) {
            inputRef.current?.click();
          }
        }}
        className={`rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          uploadEnabled
            ? isDragging
              ? "cursor-pointer border-primary bg-primary/5"
              : "cursor-pointer border-gray-300 hover:border-primary/60"
            : "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,application/pdf"
          disabled={!uploadEnabled}
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              void uploadFiles(event.target.files);
            }
          }}
        />

        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          {isUploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          ) : (
            <Upload className="h-7 w-7 text-primary" />
          )}
        </div>

        <p className="text-lg font-medium text-gray-800">
          {isUploading
            ? "Parsing statements..."
            : uploadEnabled
              ? "Drag and drop PDF statements here"
              : "Authorize processing above to upload statements"}
        </p>
        {uploadEnabled && (
          <p className="mt-2 text-sm text-gray-500">or click to browse files</p>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
