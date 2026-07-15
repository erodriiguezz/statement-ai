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
    <section className="space-y-4">
      <h3 className="text-xl font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default function ResultsStep({ results }: ResultsStepProps) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Results</h2>
        <p className="mt-2 text-gray-600">
          AI-assisted analysis based on your verified transactions.
        </p>
      </div>

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
