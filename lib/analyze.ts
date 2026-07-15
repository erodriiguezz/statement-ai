import { generateScheduleC } from "@/lib/schedule-c";
import type { AnalysisResults, Transaction } from "@/lib/types";

export async function generateAnalysis(
  transactions: Transaction[],
  businessName?: string,
): Promise<AnalysisResults> {
  const scheduleC = await generateScheduleC(transactions, businessName);

  return {
    items: [
      {
        type: "schedule_c",
        title: "Schedule C Draft",
        data: scheduleC,
      },
    ],
  };
}
