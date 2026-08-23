"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/format";

// Categorical palette: kept distinct/saturated (not monochrome) since these
// colors encode data (spending category), not brand chrome -- muting them to
// grayscale would make the pie unreadable. Toned down from pure neon so it
// still reads as "the same product" as the black/white shell around it.
const COLORS = ["#7dd3b0", "#7db8e8", "#e8c27d", "#e88f9e", "#b09ee8", "#7dd8de", "#e89bc4", "#c2d87d"];

interface Props {
  data: { category: string; amount: number }[];
}

export default function BudgetPieChart({ data }: Props) {
  if (data.length === 0) {
    return <EmptyState label="Upload a transactions CSV to see your spending breakdown." />;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="amount"
          nameKey="category"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#000", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8 }}
          formatter={(value) => [formatCurrency(Number(value)), "Spent"]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-center text-sm text-white/55">
      {label}
    </div>
  );
}
