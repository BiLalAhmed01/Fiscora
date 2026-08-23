"use client";

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./BudgetPieChart";
import type { Goal } from "@/lib/api";
import { formatCurrency } from "@/lib/format";

interface Props {
  debts: Goal[];
}

const MAX_MONTHS = 240;

function projectBalance(debt: Goal): number[] {
  const monthlyRate = (debt.interest_rate ?? 0) / 100 / 12;
  const payment = debt.min_payment && debt.min_payment > 0 ? debt.min_payment : debt.current_amount / 12;

  const balances: number[] = [];
  let balance = debt.current_amount;

  for (let month = 0; month < MAX_MONTHS && balance > 0; month++) {
    balances.push(balance);
    const interest = balance * monthlyRate;
    balance = balance + interest - payment;
    if (balance < 0) balance = 0;
  }
  return balances;
}

export default function DebtTimelineChart({ debts }: Props) {
  if (debts.length === 0) {
    return <EmptyState label="Add a debt goal to see your projected payoff timeline." />;
  }

  const perDebtBalances = debts.map(projectBalance);
  const maxLength = Math.max(...perDebtBalances.map((b) => b.length));

  const data = Array.from({ length: maxLength }, (_, month) => {
    const total = perDebtBalances.reduce((sum, balances) => sum + (balances[month] ?? 0), 0);
    return { month, balance: Math.round(total) };
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="rgba(255,255,255,0.55)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          label={{ value: "Months", position: "insideBottom", offset: -2, fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
        />
        <YAxis stroke="rgba(255,255,255,0.55)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8 }}
          formatter={(value) => [formatCurrency(Number(value), { cents: false }), "Remaining balance"]}
          labelFormatter={(month) => `Month ${month}`}
        />
        <Line type="monotone" dataKey="balance" stroke="#e88f9e" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
