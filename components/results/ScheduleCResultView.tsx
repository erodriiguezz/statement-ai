import type { ScheduleCResult } from "@/lib/types";

interface ScheduleCResultViewProps {
  data: ScheduleCResult;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function ScheduleCResultView({ data }: ScheduleCResultViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Gross receipts"
          value={formatCurrency(data.grossReceipts)}
        />
        <SummaryCard
          label="Total expenses"
          value={formatCurrency(data.totalExpenses)}
        />
        <SummaryCard
          label="Net profit"
          value={formatCurrency(data.netProfit)}
          highlight
        />
      </div>

      {(data.businessName || data.taxYear) && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          {data.businessName && (
            <p>
              <span className="font-medium">Business:</span> {data.businessName}
            </p>
          )}
          {data.taxYear && (
            <p>
              <span className="font-medium">Tax year:</span> {data.taxYear}
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="border-b px-4 py-3 font-semibold">Line</th>
              <th className="border-b px-4 py-3 font-semibold">Category</th>
              <th className="border-b px-4 py-3 font-semibold text-right">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr key={`${item.line}-${item.label}`} className="align-top">
                <td className="border-b px-4 py-3 font-medium">{item.line}</td>
                <td className="border-b px-4 py-3">
                  <p>{item.label}</p>
                  {item.transactions.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-gray-500">
                      {item.transactions.map((tx) => (
                        <li key={tx}>{tx}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="border-b px-4 py-3 text-right font-medium">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.notes && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.notes}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-4 ${
        highlight ? "border-primary bg-primary/5" : "border-gray-200 bg-white"
      }`}
    >
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
