import React from "react";

interface Step {
  icon: React.ComponentType<{ className: string; size: number }>;
  id: number;
}

interface StepperProps {
  steps: Step[];
  activeStep: number;
  completedSteps?: number[];
  onStepClick?: (stepIndex: number) => void;
}

export default function Stepper({
  steps,
  activeStep,
  completedSteps = [],
  onStepClick,
}: StepperProps) {
  const getStepStyles = (stepIndex: number) => {
    const isCompleted = completedSteps.includes(stepIndex);
    const isActive = activeStep === stepIndex;

    if (isCompleted) {
      return "bg-green-500 border-2 border-green-600";
    }
    if (isActive) {
      return "bg-primary border-2 border-primary";
    }
    return "bg-gray-100 border-2 border-gray-300";
  };

  const getIconColor = (stepIndex: number) => {
    const isCompleted = completedSteps.includes(stepIndex);
    const isActive = activeStep === stepIndex;

    if (isCompleted || isActive) {
      return "text-white";
    }
    return "text-gray-600";
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <button
            key={step.id}
            onClick={() => onStepClick?.(index)}
            className={`p-4 rounded-full transition-all hover:scale-110 ${getStepStyles(
              index,
            )}`}
          >
            <Icon className={getIconColor(index)} size={20} />
          </button>
        );
      })}
    </div>
  );
}
