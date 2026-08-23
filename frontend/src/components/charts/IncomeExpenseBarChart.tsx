"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState } from "./BudgetPieChart";
import { formatCurrency } from "@/lib/format";

interface Props {
  income: number;
  expenses: number;
}

export default function IncomeExpenseBarChart({ income, expenses }: Props) {
  if (income === 0 && expenses === 0) {
    return <EmptyState label="Set your monthly income and upload transactions to compare income vs. expenses." />;
  }

  const data = [
    { name: "Income", value: income, fill: "#7dd3b0" },
    { name: "Expenses", value: expenses, fill: "#e88f9e" },
  ];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.55)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="rgba(255,255,255,0.55)" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8 }}
          formatter={(value) => [formatCurrency(Number(value)), ""]}
          cursor={{ fill: "rgba(255,255,255,0.06)" }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
