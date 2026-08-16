"use client";

import { useState } from "react";
import { ClipboardCheck, File, FileUp } from "lucide-react";

import ResultsStep from "@/components/steps/ResultsStep";
import ReviewStep from "@/components/steps/ReviewStep";
import UploadStep, { type SelectedFile } from "@/components/steps/UploadStep";
import Stepper from "@/components/Stepper";
import type { AnalysisResults, Transaction } from "@/lib/types";

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);

  // Upload step state — lifted so it survives navigating away and back
  // (the step components below unmount when not active).
  const [consent, setConsent] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  // ids of the files that produced the current `transactions`, so we can
  // tell whether the selection has changed since the last analysis.
  const [analyzedFileIds, setAnalyzedFileIds] = useState<string[]>([]);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [results, setResults] = useState<AnalysisResults | null>(null);

  const steps = [
    { id: 1, icon: FileUp, text: "Upload" },
    { id: 2, icon: File, text: "Review" },
    { id: 3, icon: ClipboardCheck, text: "Results" },
  ];

  // The current file selection still matches what was actually analysed —
  // i.e. nothing was added/removed since, so re-parsing would be wasted work.
  const alreadyAnalyzed =
    transactions.length > 0 &&
    selectedFiles.length === analyzedFileIds.length &&
    selectedFiles.every((f) => analyzedFileIds.includes(f.id));

  // Reachable steps are derived from data, not tracked separately — a step
  // stays reachable (via the Stepper or "Continue") until its input changes
  // underneath it, at which point it must be redone before moving forward
  // again. Upload is always reachable.
  const completedSteps = [
    0,
    ...(alreadyAnalyzed ? [1] : []),
    ...(results ? [2] : []),
  ];

  const handleUploadComplete = (uploadedTransactions: Transaction[]) => {
    setTransactions(uploadedTransactions);
    setAnalyzedFileIds(selectedFiles.map((f) => f.id));
    setResults(null);
    setActiveStep(1);
  };

  const handleContinueToReview = () => {
    setActiveStep(1);
  };

  // Changing the file selection invalidates any draft generated from the
  // previous analysis — it's now based on data that's no longer current.
  const handleSelectedFilesChange = (files: SelectedFile[]) => {
    setSelectedFiles(files);
    if (results) {
      setResults(null);
    }
  };

  // Editing transactions after a draft was generated invalidates that
  // draft — it must be regenerated before Results can be revisited.
  const handleTransactionsChange = (updated: Transaction[]) => {
    setTransactions(updated);
    if (results) {
      setResults(null);
    }
  };

  const handleReviewComplete = (generatedResults: AnalysisResults) => {
    setResults(generatedResults);
    setActiveStep(2);
  };

  // Only let users jump back to a step they've already visited — never
  // skip ahead to one that isn't ready yet.
  const handleStepClick = (index: number) => {
    if (completedSteps.includes(index) || index === activeStep) {
      setActiveStep(index);
    }
  };

  // Review's transaction table benefits from more horizontal room than the
  // other two steps, so it gets a wider max-width than the shared 5xl.
  const stepMaxWidth = activeStep === 1 ? "max-w-7xl" : "max-w-5xl";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 pt-2 md:px-8 md:pb-16">
      <div className="mx-auto max-w-5xl">
        <Stepper
          steps={steps}
          activeStep={activeStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      <div key={activeStep} className={`mx-auto animate-fade-up ${stepMaxWidth}`}>
        {activeStep === 0 && (
          <UploadStep
            consent={consent}
            onConsentChange={setConsent}
            selectedFiles={selectedFiles}
            onSelectedFilesChange={handleSelectedFilesChange}
            alreadyAnalyzed={alreadyAnalyzed}
            onComplete={handleUploadComplete}
            onContinue={handleContinueToReview}
          />
        )}

        {activeStep === 1 && (
          <ReviewStep
            transactions={transactions}
            onTransactionsChange={handleTransactionsChange}
            businessName={businessName}
            onBusinessNameChange={setBusinessName}
            onComplete={handleReviewComplete}
          />
        )}

        {activeStep === 2 && results && <ResultsStep results={results} />}
      </div>
    </div>
  );
}
