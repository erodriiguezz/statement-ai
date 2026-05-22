"use client";

import { useState } from "react";
import { FileUp, File, ChartPie } from "lucide-react";
import Stepper from "@/components/Stepper";

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { id: 1, icon: FileUp, text: "Upload" },
    { id: 2, icon: File, text: "Review" },
    { id: 3, icon: ChartPie, text: "Analyze" },
  ];

  const handleStepClick = (stepIndex: number) => {
    setActiveTab(stepIndex);
  };

  return (
    <div className="w-full max-w-2xl py-28 px-4 md:px-8 mx-auto">
      <Stepper
        steps={steps}
        activeStep={activeTab}
        completedSteps={completedSteps}
      />
    </div>
  );
}
