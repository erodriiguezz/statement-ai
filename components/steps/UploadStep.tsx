"use client";

import { useEffect, useRef, useState } from "react";
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

  // Pre-wake Render free-tier parser while the user is on the upload step.
  useEffect(() => {
    void fetch("/api/parser-health", { cache: "no-store" }).catch(() => {
      // Best-effort warm-up; upload path retries on its own.
    });
  }, []);

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
    <div className="space-y-8">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-5xl leading-[1.08] tracking-[-0.03em] text-ink md:text-6xl">
          Statement<span className="text-accent">.AI</span>
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-muted">
          Upload statements, review transactions, and draft your Schedule C.
          PDFs are parsed locally; only verified transaction text is used for AI
          categorization when enabled.
        </p>
      </header>

      <label className="mx-auto flex max-w-2xl cursor-pointer items-start justify-center gap-3 text-left text-sm leading-relaxed text-muted">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
        />
        <span>
          I authorize temporary processing of my documents for Schedule C
          preparation. PDFs are parsed locally and not retained. If AI drafting
          is enabled, extracted transaction details may be sent to the AI
          provider for categorization.
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
        role={uploadEnabled ? "button" : undefined}
        tabIndex={uploadEnabled ? 0 : -1}
        onKeyDown={(event) => {
          if (!uploadEnabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative overflow-hidden rounded-[2rem] border px-6 py-16 text-center transition-all duration-300 md:py-24 ${
          uploadEnabled
            ? isDragging
              ? "border-accent bg-accent-soft scale-[1.01]"
              : `border-edge/80 bg-white/60 hover:border-accent/40 hover:bg-white/90 ${
                  consent ? "animate-soft-pulse" : ""
                }`
            : "cursor-not-allowed border-edge/60 bg-white/40 opacity-65"
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

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {isUploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <Upload className="h-6 w-6" />
          )}
        </div>

        <p className="font-display text-3xl tracking-[-0.02em] text-ink md:text-4xl">
          {isUploading
            ? "Parsing your statements…"
            : uploadEnabled
              ? "Drop your PDFs here"
              : "Check the box above to begin"}
        </p>
        {uploadEnabled && (
          <p className="mt-3 text-sm text-muted">or click to browse files</p>
        )}
      </div>

      {error && (
        <p className="mx-auto max-w-2xl rounded-2xl border border-danger/20 bg-white px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
