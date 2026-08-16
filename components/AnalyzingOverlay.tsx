"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

const ANALYSIS_MESSAGES = [
  "Uploading your statements…",
  "Reading PDF pages…",
  "Detecting your bank's layout…",
  "Running OCR on scanned pages…",
  "Extracting transaction lines…",
  "Normalizing dates and amounts…",
  "Matching known statement formats…",
  "Wrapping up…",
];

const MESSAGE_INTERVAL_MS = 2200;

interface AnalyzingOverlayProps {
  fileCount: number;
}

export default function AnalyzingOverlay({ fileCount }: AnalyzingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % ANALYSIS_MESSAGES.length);
    }, MESSAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!mounted) {
    return null;
  }

  // Portal to <body> — a transformed ancestor (the step wrapper's
  // animate-fade-up) would otherwise scope `fixed` to itself instead of
  // the viewport.
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-edge bg-white/95 px-8 py-10 text-center shadow-xl">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="font-display text-2xl tracking-[-0.02em] text-ink">
          Analysing {fileCount} statement{fileCount === 1 ? "" : "s"}
        </p>
        <p
          key={messageIndex}
          className="mt-3 min-h-[1.5rem] animate-fade-up text-sm text-muted"
        >
          {ANALYSIS_MESSAGES[messageIndex]}
        </p>
      </div>
    </div>,
    document.body,
  );
}
