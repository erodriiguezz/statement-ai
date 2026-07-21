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
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryStat
          label="Gross receipts"
          value={formatCurrency(data.grossReceipts)}
        />
        <SummaryStat
          label="Total expenses"
          value={formatCurrency(data.totalExpenses)}
        />
        <SummaryStat
          label="Net profit"
          value={formatCurrency(data.netProfit)}
          highlight
        />
      </div>

      {(data.businessName || data.taxYear) && (
        <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
          {data.businessName && (
            <p>
              <span className="block text-xs uppercase tracking-[0.08em]">
                Business
              </span>
              <span className="mt-1 block text-base text-ink">
                {data.businessName}
              </span>
            </p>
          )}
          {data.taxYear && (
            <p>
              <span className="block text-xs uppercase tracking-[0.08em]">
                Tax year
              </span>
              <span className="mt-1 block font-mono-amount text-base text-ink">
                {data.taxYear}
              </span>
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-3xl border border-edge bg-white/75">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em]">
                Line
              </th>
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em]">
                Category
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.08em]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {data.lineItems.map((item) => (
              <tr
                key={`${item.line}-${item.label}`}
                className="align-top border-t border-edge/70"
              >
                <td className="px-5 py-4 font-medium text-ink">{item.line}</td>
                <td className="px-5 py-4">
                  <p className="text-ink">{item.label}</p>
                  {item.transactions.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-muted">
                      {item.transactions.map((tx) => (
                        <li key={tx}>{tx}</li>
                      ))}
                    </ul>
                  )}
                </td>
                <td className="px-5 py-4 text-right font-mono-amount font-medium text-ink">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.notes && (
        <div className="rounded-2xl border border-warning/25 bg-[#fff8eb] px-4 py-3 text-sm text-warning">
          {data.notes}
        </div>
      )}
    </div>
  );
}

function SummaryStat({
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
      className={`rounded-3xl border px-5 py-5 ${
        highlight
          ? "border-accent/30 bg-accent-soft"
          : "border-edge bg-white/70"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        {label}
      </p>
      <p
        className={`mt-2 font-mono-amount text-2xl font-semibold tracking-tight ${
          highlight ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
