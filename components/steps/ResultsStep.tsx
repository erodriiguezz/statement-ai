"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import ScheduleCResultView from "@/components/results/ScheduleCResultView";
import { exportScheduleCToXlsx } from "@/lib/export-schedule-c";
import type { AnalysisResults, ScheduleCResult } from "@/lib/types";

interface ResultsStepProps {
  results: AnalysisResults;
}

function ResultSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-display text-3xl tracking-[-0.02em] text-ink">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function DownloadButton({ data }: { data: ScheduleCResult }) {
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      await exportScheduleCToXlsx(data);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={isExporting}
        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-edge bg-white px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {isExporting ? "Preparing file…" : "Download"}
      </button>
      <p className="text-xs text-muted">Downloads .xlsx — import into Excel or Google Sheets</p>
    </div>
  );
}

export default function ResultsStep({ results }: ResultsStepProps) {
  return (
    <div className="space-y-10">
      <header className="max-w-2xl">
        <h2 className="font-display text-4xl tracking-[-0.03em] text-ink md:text-5xl">
          Your draft is ready
        </h2>
        <p className="mt-3 text-lg text-muted">
          Built from the transactions you verified.
        </p>
      </header>

      {results.items.map((item) => {
        switch (item.type) {
          case "schedule_c":
            return (
              <ResultSection
                key={item.type}
                title={item.title}
                action={<DownloadButton data={item.data} />}
              >
                <ScheduleCResultView data={item.data} />
              </ResultSection>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
