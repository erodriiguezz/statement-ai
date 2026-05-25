import React from "react";

interface Step {
  icon: React.ComponentType<{ className: string; size: number }>;
  id: number;
  text: string;
}

interface StepperProps {
  steps: Step[];
  activeStep: number;
  completedSteps?: number[];
}

export default function Stepper({
  steps,
  activeStep,
  completedSteps = [],
}: StepperProps) {
  const getStepClasses = (stepIndex: number) => {
    const isCompleted = completedSteps.includes(stepIndex);
    const isActive = activeStep === stepIndex;

    let container = "bg-gray-100 border-2 border-gray-300";
    let icon = "text-gray-600";
    let text = "text-gray-600";

    if (isCompleted || isActive) {
      container = "bg-primary border-2 border-primary";
      icon = "text-white";
      text = "text-primary";
    }

    return { container, icon, text };
  };

  return (
    <div className="flex items-center justify-between gap-4 mb-12">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const { container, icon, text } = getStepClasses(index);

        return (
          <div key={step.id} className="flex flex-col items-center">
            <div className={`p-2 rounded-full transition-all ${container}`}>
              <Icon className={icon} size={20} />
            </div>

            <p
              className={`text-sm font-medium uppercase mt-3 transition-colors ${text}`}
            >
              {step.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
