"use client";

import { useState } from "react";
import { FileUp, File, ChartPie } from "lucide-react";
import Stepper from "@/components/Stepper";

export default function Home() {
  const [activeTab, setActiveTab] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    { id: 1, icon: FileUp },
    { id: 2, icon: File },
    { id: 3, icon: ChartPie },
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
        onStepClick={handleStepClick}
      />
    </div>
  );
}
