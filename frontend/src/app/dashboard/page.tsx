"use client";

import { useCallback, useEffect, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import BudgetPieChart from "@/components/charts/BudgetPieChart";
import IncomeExpenseBarChart from "@/components/charts/IncomeExpenseBarChart";
import DebtTimelineChart from "@/components/charts/DebtTimelineChart";
import CsvUploadPanel from "@/components/CsvUploadPanel";
import WatchlistPanel from "@/components/WatchlistPanel";
import ProfilePanel from "@/components/ProfilePanel";
import GoalsPanel from "@/components/GoalsPanel";
import {
  getGoals,
  getProfile,
  getTransactions,
  getWatchlist,
  type Goal,
  type Profile,
  type Transaction,
  type WatchlistItem,
} from "@/lib/api";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h2 className="mb-3 text-sm font-medium text-white/70">{title}</h2>
      {children}
    </div>
  );
}

function DashboardInner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const [p, t, w, g] = await Promise.all([
      getProfile(),
      getTransactions(),
      getWatchlist(),
      getGoals(),
    ]);
    setProfile(p);
    setTransactions(t);
    setWatchlist(w);
    setGoals(g);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  if (loading || !profile) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8" aria-busy="true" aria-label="Loading dashboard">
        <div className="skeleton mb-6 h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="skeleton h-[300px] lg:col-span-2" />
          <div className="skeleton h-[300px]" />
          <div className="skeleton h-[300px] lg:col-span-2" />
          <div className="flex flex-col gap-4">
            <div className="skeleton h-[140px]" />
            <div className="skeleton h-[140px]" />
          </div>
          <div className="skeleton h-[220px]" />
          <div className="skeleton h-[220px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  const categoryTotals = Object.entries(
    transactions.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + t.amount;
      return acc;
    }, {})
  ).map(([category, amount]) => ({ category, amount }));

  const totalExpenses = transactions.reduce((sum, t) => sum + t.amount, 0);
  const debtGoals = goals.filter((g) => g.goal_type === "debt");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="Spending by category">
            <BudgetPieChart data={categoryTotals} />
          </Card>
        </div>
        <Card title="Income vs. expenses">
          <IncomeExpenseBarChart income={profile.monthly_income} expenses={totalExpenses} />
        </Card>

        <div className="lg:col-span-2">
          <Card title="Debt payoff timeline">
            <DebtTimelineChart debts={debtGoals} />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <ProfilePanel profile={profile} onChange={refetch} />
          <CsvUploadPanel onUploaded={refetch} />
        </div>

        <WatchlistPanel items={watchlist} onChange={refetch} />
        <div className="lg:col-span-2">
          <GoalsPanel goals={goals} onChange={refetch} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
