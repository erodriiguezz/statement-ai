"use client";

import { useState } from "react";
import { ClipboardCheck, File, FileUp } from "lucide-react";

import ResultsStep from "@/components/steps/ResultsStep";
import ReviewStep from "@/components/steps/ReviewStep";
import UploadStep from "@/components/steps/UploadStep";
import Stepper from "@/components/Stepper";
import type { AnalysisResults, Transaction } from "@/lib/types";

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [results, setResults] = useState<AnalysisResults | null>(null);

  const steps = [
    { id: 1, icon: FileUp, text: "Upload" },
    { id: 2, icon: File, text: "Review" },
    { id: 3, icon: ClipboardCheck, text: "Results" },
  ];

  const handleUploadComplete = (uploadedTransactions: Transaction[]) => {
    setTransactions(uploadedTransactions);
    setCompletedSteps([0]);
    setActiveStep(1);
  };

  const handleReviewComplete = (generatedResults: AnalysisResults) => {
    setResults(generatedResults);
    setCompletedSteps([0, 1]);
    setActiveStep(2);
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 md:px-8 md:py-24">
      <Stepper
        steps={steps}
        activeStep={activeStep}
        completedSteps={completedSteps}
      />

      {activeStep === 0 && <UploadStep onComplete={handleUploadComplete} />}

      {activeStep === 1 && (
        <ReviewStep
          transactions={transactions}
          onTransactionsChange={setTransactions}
          onComplete={handleReviewComplete}
        />
      )}

      {activeStep === 2 && results && <ResultsStep results={results} />}
    </div>
  );
}
