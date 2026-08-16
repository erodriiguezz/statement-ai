"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

import AnalyzingOverlay from "@/components/AnalyzingOverlay";
import type { Transaction } from "@/lib/types";

export interface SelectedFile {
  id: string;
  file: File;
}

interface UploadStepProps {
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
  selectedFiles: SelectedFile[];
  onSelectedFilesChange: (files: SelectedFile[]) => void;
  /** True when selectedFiles exactly matches the set already analysed into transactions. */
  alreadyAnalyzed: boolean;
  onComplete: (transactions: Transaction[]) => void;
  onContinue: () => void;
}

export default function UploadStep({
  consent,
  onConsentChange,
  selectedFiles,
  onSelectedFilesChange,
  alreadyAnalyzed,
  onComplete,
  onContinue,
}: UploadStepProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropEnabled = consent && !isAnalyzing;
  const canAnalyze = consent && !isAnalyzing && selectedFiles.length > 0;

  // Pre-wake Render free-tier parser while the user is on the upload step.
  useEffect(() => {
    void fetch("/api/parser-health", { cache: "no-store" }).catch(() => {
      // Best-effort warm-up; upload path retries on its own.
    });
  }, []);

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter((file) =>
      file.name.toLowerCase().endsWith(".pdf"),
    );

    if (fileArray.length === 0) {
      setError("Please add at least one PDF bank statement.");
      return;
    }

    setError(null);
    onSelectedFilesChange([
      ...selectedFiles,
      ...fileArray.map((file) => ({ id: crypto.randomUUID(), file })),
    ]);
  };

  const removeFile = (id: string) => {
    onSelectedFilesChange(selectedFiles.filter((entry) => entry.id !== id));
  };

  const analyzeFiles = async () => {
    if (!consent) {
      setError("You must authorize temporary processing before uploading.");
      return;
    }

    if (selectedFiles.length === 0) {
      setError("Add at least one PDF bank statement first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(({ file }) => formData.append("files", file));

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
    } catch (analyzeError) {
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Failed to parse statements.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    if (!dropEnabled) {
      return;
    }

    if (event.dataTransfer.files.length > 0) {
      addFiles(event.dataTransfer.files);
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
          onChange={(e) => onConsentChange(e.target.checked)}
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
          if (!dropEnabled) {
            return;
          }
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (dropEnabled) {
            inputRef.current?.click();
          }
        }}
        role={dropEnabled ? "button" : undefined}
        tabIndex={dropEnabled ? 0 : -1}
        onKeyDown={(event) => {
          if (!dropEnabled) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`relative overflow-hidden rounded-[2rem] border px-6 py-16 text-center transition-all duration-300 md:py-24 ${
          dropEnabled
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
          disabled={!dropEnabled}
          className="hidden"
          onChange={(event) => {
            if (event.target.files?.length) {
              addFiles(event.target.files);
              event.target.value = "";
            }
          }}
        />

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Upload className="h-6 w-6" />
        </div>

        <p className="font-display text-3xl tracking-[-0.02em] text-ink md:text-4xl">
          {dropEnabled ? "Drop your PDFs here" : "Check the box above to begin"}
        </p>
        {dropEnabled && (
          <p className="mt-3 text-sm text-muted">or click to browse files</p>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <ul className="mx-auto max-w-2xl space-y-2">
          {selectedFiles.map(({ id, file }) => (
            <li
              key={id}
              className="flex items-center gap-3 rounded-2xl border border-edge bg-white/75 px-4 py-3"
            >
              <FileText className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {file.name}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <button
                type="button"
                onClick={() => removeFile(id)}
                disabled={isAnalyzing}
                className="shrink-0 rounded-lg p-1 text-muted transition-colors hover:bg-accent-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="mx-auto max-w-2xl rounded-2xl border border-danger/20 bg-white px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
        {alreadyAnalyzed ? (
          <>
            <button
              type="button"
              onClick={onContinue}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
            >
              Continue to review
            </button>
            <p className="text-xs text-muted">
              Already analysed — add or remove a file to re-run parsing.
            </p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => void analyzeFiles()}
            disabled={!canAnalyze}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {isAnalyzing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAnalyzing
              ? "Analysing statements…"
              : selectedFiles.length > 0
                ? `Analyse ${selectedFiles.length} file${selectedFiles.length === 1 ? "" : "s"}`
                : "Analyse files"}
          </button>
        )}
      </div>

      {isAnalyzing && <AnalyzingOverlay fileCount={selectedFiles.length} />}
    </div>
  );
}
