import ScheduleCResultView from "@/components/results/ScheduleCResultView";
import type { AnalysisResults } from "@/lib/types";

interface ResultsStepProps {
  results: AnalysisResults;
}

function ResultSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h3 className="font-display text-3xl tracking-[-0.02em] text-ink">
        {title}
      </h3>
      {children}
    </section>
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
              <ResultSection key={item.type} title={item.title}>
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
