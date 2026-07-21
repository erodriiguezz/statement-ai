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
  return (
    <div className="mb-10 flex items-center justify-center gap-2 md:mb-12 md:gap-3">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(index);
        const isActive = activeStep === index;
        const Icon = step.icon;

        return (
          <div key={step.id} className="flex items-center gap-2 md:gap-3">
            <div
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 transition-all duration-300 ${
                isActive
                  ? "bg-accent text-white shadow-sm"
                  : isCompleted
                    ? "bg-accent-soft text-accent"
                    : "bg-white/70 text-muted"
              }`}
            >
              <Icon className="h-4 w-4" size={16} />
              <span className="text-sm font-medium">{step.text}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-px w-6 transition-colors duration-300 md:w-10 ${
                  completedSteps.includes(index) ? "bg-accent/50" : "bg-edge"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
