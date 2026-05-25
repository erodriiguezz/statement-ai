"use client";

import { useState } from "react";
import { FileUp, File, ChartPie } from "lucide-react";
import Stepper from "@/components/Stepper";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [analysis, setAnalysis] = useState<string>("");

  const steps = [
    { id: 1, icon: FileUp, text: "Upload" },
    { id: 2, icon: File, text: "Review" },
    { id: 3, icon: ChartPie, text: "Analyze" },
  ];

  const handleUploadComplete = (uploadedTransactions: Transaction[]) => {
    setTransactions(uploadedTransactions);
    setCompletedSteps([0]);
    setActiveStep(1);
  };

  const handleTransactionsUpdate = (updatedTransactions: Transaction[]) => {
    setTransactions(updatedTransactions);
  };

  const handleReviewComplete = (generatedAnalysis: string) => {
    setAnalysis(generatedAnalysis);
    setCompletedSteps([0, 1]);
    setActiveStep(2);
  };

  return (
    <div className="w-full max-w-2xl py-12 md:py-24 px-4 md:px-8 mx-auto">
      <Stepper
        steps={steps}
        activeStep={activeStep}
        completedSteps={completedSteps}
      />

      <div>
        {/* Step 1: Upload Bank Statements */}
        {activeStep === 0 && (
          <div className="space-y-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4">
                Turn Statements into Tax Forms
              </h2>

              <p className="text-xl">
                Securely upload your bank or credit card statements. Our AI
                instantly categorizes your transactions to generate a
                ready-to-file IRS Schedule C.
              </p>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <p className="text-gray-600 mb-4">
                Drag and drop your bank statements here or click to upload
              </p>
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx"
                onChange={(e) => {
                  // Handle file upload
                  // For now, simulate upload
                  if (e.target.files?.length) {
                    handleUploadComplete([
                      {
                        id: "1",
                        description: "Coffee",
                        amount: -5.5,
                        date: "2024-05-20",
                      },
                      {
                        id: "2",
                        description: "Salary",
                        amount: 5000,
                        date: "2024-05-19",
                      },
                    ]);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-blue-600 hover:underline"
              >
                Click to select files
              </label>
            </div>
          </div>
        )}

        {/* Step 2: Review & Edit Transactions */}
        {activeStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Review Transactions</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-4 py-2 text-left">Date</th>
                    <th className="border px-4 py-2 text-left">Description</th>
                    <th className="border px-4 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="border px-4 py-2">{tx.date}</td>
                      <td className="border px-4 py-2">
                        <input
                          type="text"
                          value={tx.description}
                          onChange={(e) => {
                            const updated = transactions.map((t) =>
                              t.id === tx.id
                                ? { ...t, description: e.target.value }
                                : t,
                            );
                            handleTransactionsUpdate(updated);
                          }}
                          className="w-full border rounded px-2 py-1"
                        />
                      </td>
                      <td className="border px-4 py-2 text-right">
                        <input
                          type="number"
                          value={tx.amount}
                          onChange={(e) => {
                            const updated = transactions.map((t) =>
                              t.id === tx.id
                                ? { ...t, amount: parseFloat(e.target.value) }
                                : t,
                            );
                            handleTransactionsUpdate(updated);
                          }}
                          className="w-full border rounded px-2 py-1 text-right"
                          step="0.01"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={() => handleReviewComplete("Sample analysis...")}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
            >
              Generate Analysis
            </button>
          </div>
        )}

        {/* Step 3: AI Analysis */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">AI Analysis</h2>
            <div className="bg-gray-50 border rounded-lg p-6">
              <p className="text-gray-700 whitespace-pre-wrap">{analysis}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
