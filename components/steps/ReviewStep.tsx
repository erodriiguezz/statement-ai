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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Review Transactions</h2>
        <p className="mt-2 text-gray-600">
          Verify parsed transactions, edit descriptions and amounts, then
          confirm to generate your results.
        </p>
      </div>

      <div>
        <label
          htmlFor="business-name"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Business name (optional)
        </label>
        <input
          id="business-name"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Consulting LLC"
          className="w-full rounded-lg border border-gray-200 px-3 py-2"
        />
      </div>

      <TransactionTable
        transactions={transactions}
        onChange={onTransactionsChange}
      />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleConfirm()}
        disabled={isSubmitting}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isSubmitting ? "Generating results..." : "Confirm & Generate Results"}
      </button>
    </div>
  );
}
