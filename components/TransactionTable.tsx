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
        return { ...tx, amount: parseFloat(value) || 0 };
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
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="border-b px-4 py-3 font-semibold">Date</th>
              <th className="border-b px-4 py-3 font-semibold">Description</th>
              <th className="border-b px-4 py-3 font-semibold text-right">
                Amount
              </th>
              <th className="border-b px-4 py-3 w-16" />
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50/80">
                <td className="border-b px-4 py-2">
                  <input
                    type="date"
                    value={tx.date}
                    onChange={(e) =>
                      updateTransaction(tx.id, "date", e.target.value)
                    }
                    className="w-full rounded border border-gray-200 px-2 py-1.5"
                  />
                </td>
                <td className="border-b px-4 py-2">
                  <input
                    type="text"
                    value={tx.description}
                    onChange={(e) =>
                      updateTransaction(tx.id, "description", e.target.value)
                    }
                    className="w-full rounded border border-gray-200 px-2 py-1.5"
                    placeholder="Transaction description"
                  />
                </td>
                <td className="border-b px-4 py-2">
                  <input
                    type="number"
                    value={tx.amount}
                    onChange={(e) =>
                      updateTransaction(tx.id, "amount", e.target.value)
                    }
                    className="w-full rounded border border-gray-200 px-2 py-1.5 text-right"
                    step="0.01"
                  />
                </td>
                <td className="border-b px-4 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => removeTransaction(tx.id)}
                    className="text-red-600 hover:text-red-800"
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
        className="text-sm font-medium text-primary hover:underline"
      >
        + Add transaction
      </button>
    </div>
  );
}
