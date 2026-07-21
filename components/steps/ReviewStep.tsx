"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import TransactionTable from "@/components/TransactionTable";
import type { AnalysisResults, Transaction } from "@/lib/types";

interface ReviewStepProps {
  transactions: Transaction[];
  onTransactionsChange: (transactions: Transaction[]) => void;
  onComplete: (results: AnalysisResults) => void;
}

export default function ReviewStep({
  transactions,
  onTransactionsChange,
  onComplete,
}: ReviewStepProps) {
  const [businessName, setBusinessName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (transactions.length === 0) {
      setError("Add at least one transaction before continuing.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactions,
          businessName: businessName.trim() || undefined,
        }),
      });

      const payload = (await response.json()) as {
        results?: AnalysisResults;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to generate results.");
      }

      if (!payload.results?.items.length) {
        throw new Error("Analysis response was empty.");
      }

      onComplete(payload.results);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to generate results.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h2 className="font-display text-4xl tracking-[-0.03em] text-ink md:text-5xl">
          Review transactions
        </h2>
          <p className="mt-3 text-lg text-muted">
          Make sure everything looks right, then generate your Schedule C draft.
          AI will categorize these verified transactions into Schedule C lines.
        </p>
      </header>

      <div className="max-w-md">
        <label
          htmlFor="business-name"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Business name{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="business-name"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Consulting LLC"
          className="w-full rounded-2xl border border-edge bg-white/80 px-4 py-3 outline-none transition-colors focus:border-accent"
        />
      </div>

      <TransactionTable
        transactions={transactions}
        onChange={onTransactionsChange}
      />

      {error && (
        <p className="rounded-2xl border border-danger/20 bg-white px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={isSubmitting}
        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-accent px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Generating draft…" : "Confirm & generate draft"}
      </button>
    </div>
  );
}
