import { parseTransactionRef } from "@/lib/transaction-ref";
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
                      {item.transactions.map((tx, index) => (
                        <li key={`${item.line}-${index}`}>{tx}</li>
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

      {data.excludedTransactions.length > 0 && (
        <PersonalTransactionsSection refs={data.excludedTransactions} />
      )}
    </div>
  );
}

function PersonalTransactionsSection({ refs }: { refs: string[] }) {
  const transactions = refs.map(parseTransactionRef);
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-display text-2xl tracking-[-0.02em] text-ink">
          Personal
        </h4>
        <p className="mt-1 text-sm text-muted">
          Transfers, owner draws, and personal spending — left out of the
          Schedule C totals above.
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-edge bg-white/50">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em]">
                Date
              </th>
              <th className="px-5 py-4 text-xs font-semibold uppercase tracking-[0.08em]">
                Description
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-[0.08em]">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr
                key={`${tx.date}-${index}`}
                className="border-t border-edge/70"
              >
                <td className="px-5 py-3 text-ink">{tx.date}</td>
                <td className="px-5 py-3 text-ink">{tx.description}</td>
                <td className="px-5 py-3 text-right font-mono-amount text-ink">
                  {formatCurrency(tx.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-edge/70">
              <td
                colSpan={2}
                className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted"
              >
                Total excluded
              </td>
              <td className="px-5 py-3 text-right font-mono-amount font-medium text-ink">
                {formatCurrency(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
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
