"use client";

import { FormEvent, useState } from "react";
import { addGoal, removeGoal, type Goal } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  goals: Goal[];
  onChange: () => void;
}

export default function GoalsPanel({ goals, onChange }: Props) {
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<"savings" | "debt">("debt");
  const [targetAmount, setTargetAmount] = useState("0");
  const [currentAmount, setCurrentAmount] = useState("0");
  const [interestRate, setInterestRate] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await addGoal({
        name: name.trim(),
        goal_type: goalType,
        target_amount: parseFloat(targetAmount) || 0,
        current_amount: parseFloat(currentAmount) || 0,
        interest_rate: interestRate ? parseFloat(interestRate) : undefined,
        min_payment: minPayment ? parseFloat(minPayment) : undefined,
      });
      setName("");
      setTargetAmount("0");
      setCurrentAmount("0");
      setInterestRate("");
      setMinPayment("");
      onChange();
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: number) => {
    await removeGoal(id);
    onChange();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-medium text-white/70">Goals (savings &amp; debt)</h3>

      <form onSubmit={handleAdd} className="mb-4 grid grid-cols-2 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Credit Card)"
          aria-label="Goal name"
          className="col-span-2 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs outline-none focus:border-white/40"
        />
        <select
          value={goalType}
          onChange={(e) => setGoalType(e.target.value as "savings" | "debt")}
          aria-label="Goal type"
          className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs outline-none focus:border-white/40"
        >
          <option value="debt">Debt</option>
          <option value="savings">Savings</option>
        </select>
        <input
          value={currentAmount}
          onChange={(e) => setCurrentAmount(e.target.value)}
          type="number"
          placeholder="Current balance"
          aria-label="Current balance"
          className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs outline-none focus:border-white/40"
        />
        <input
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          type="number"
          placeholder="Target amount"
          aria-label="Target amount"
          className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs outline-none focus:border-white/40"
        />
        <input
          value={interestRate}
          onChange={(e) => setInterestRate(e.target.value)}
          type="number"
          placeholder="Interest rate %"
          aria-label="Interest rate percent"
          title="Only needed for debt goals -- Fiscora uses this to project a payoff timeline."
          className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs outline-none focus:border-white/40"
        />
        <input
          value={minPayment}
          onChange={(e) => setMinPayment(e.target.value)}
          type="number"
          placeholder="Min. monthly payment"
          aria-label="Minimum monthly payment"
          title="Only needed for debt goals -- Fiscora uses this to project a payoff timeline."
          className="col-span-2 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="col-span-2 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          Add goal
        </button>
      </form>
      <p className="mb-3 text-xs text-white/55">
        Ask the chat &quot;should I use avalanche or snowball to pay this off?&quot; once it&apos;s added --
        the debt agent will compare both strategies against your real numbers.
      </p>

      {goals.length === 0 ? (
        <p className="text-xs text-white/55">
          No goals yet -- add a debt or savings target above to start tracking payoff progress.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {goals.map((g) => (
            <li
              key={g.id}
              className="flex items-center justify-between rounded-md bg-white/5 px-2.5 py-1.5 text-sm"
            >
              <span>
                <span className="font-medium">{g.name}</span>{" "}
                <span className="text-xs text-white/55">
                  ({g.goal_type}, {formatCurrency(g.current_amount, { cents: false })})
                </span>
              </span>
              <button
                onClick={() => handleRemove(g.id)}
                className="text-xs text-white/55 hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
