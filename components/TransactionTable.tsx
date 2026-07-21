"use client";

import DateCell from "@/components/DateCell";
import type { Transaction } from "@/lib/types";

interface TransactionTableProps {
  transactions: Transaction[];
  onChange: (transactions: Transaction[]) => void;
}

export default function TransactionTable({
  transactions,
  onChange,
}: TransactionTableProps) {
  const updateTransaction = (
    id: string,
    field: keyof Transaction,
    value: string,
  ) => {
    const updated = transactions.map((tx) => {
      if (tx.id !== id) {
        return tx;
      }

      if (field === "amount") {
        const parsed = Number.parseFloat(value);
        return { ...tx, amount: Number.isFinite(parsed) ? parsed : 0 };
      }

      return { ...tx, [field]: value };
    });

    onChange(updated);
  };

  const removeTransaction = (id: string) => {
    onChange(transactions.filter((tx) => tx.id !== id));
  };

  const addTransaction = () => {
    onChange([
      ...transactions,
      {
        id: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        description: "",
        amount: 0,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-3xl border border-edge bg-white/75">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[9.5rem]" />
            <col />
            <col className="w-[8.5rem]" />
            <col className="w-14" />
          </colgroup>
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
              <th className="px-4 py-4" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr
                key={tx.id}
                className="border-t border-edge/70 transition-colors hover:bg-accent-soft/40"
              >
                <td className="px-5 py-2.5 align-middle">
                  <DateCell
                    value={tx.date}
                    onChange={(next) =>
                      updateTransaction(tx.id, "date", next)
                    }
                  />
                </td>
                <td className="px-5 py-2.5 align-middle">
                  <input
                    type="text"
                    value={tx.description}
                    onChange={(e) =>
                      updateTransaction(tx.id, "description", e.target.value)
                    }
                    className="w-full min-w-0 rounded-xl border border-transparent bg-transparent py-2 outline-none focus:border-edge focus:bg-white focus:px-2"
                    placeholder="Transaction description"
                  />
                </td>
                <td className="px-5 py-2.5 align-middle">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={tx.amount}
                    onChange={(e) =>
                      updateTransaction(tx.id, "amount", e.target.value)
                    }
                    className="no-spinner w-full rounded-xl border border-transparent bg-transparent py-2 text-right font-mono-amount outline-none focus:border-edge focus:bg-white focus:px-2"
                    step="0.01"
                  />
                </td>
                <td className="px-4 py-2.5 text-center align-middle">
                  <button
                    type="button"
                    onClick={() => removeTransaction(tx.id)}
                    className="rounded-xl px-2 text-lg text-muted transition-colors hover:bg-white hover:text-danger"
                    aria-label="Remove transaction"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={addTransaction}
        className="cursor-pointer text-sm font-semibold text-accent transition-colors hover:text-ink"
      >
        + Add transaction
      </button>
    </div>
  );
}
