"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RequireAuth from "@/components/RequireAuth";

const STEPS = [
  {
    kicker: "Welcome to Fiscora",
    title: "One coordinator, six specialists",
    body: "Every question you ask goes to a coordinator agent that figures out which specialist(s) can actually answer it, then merges their answers into one clear response -- so you never have to know which tool to reach for.",
  },
  {
    kicker: "What you can ask",
    title: "Markets, budgets, and everything between",
    body: null,
    grid: [
      { label: "Market research", hint: "“What's happening with NVDA this week?”" },
      { label: "Investment comparison", hint: "“Should I buy AAPL or MSFT right now?”" },
      { label: "Budgeting & debt", hint: "“Where can I cut spending to pay off my card faster?”" },
      { label: "Savings planning", hint: "“How big should my emergency fund be?”" },
    ],
  },
  {
    kicker: "One more thing",
    title: "The more Fiscora knows, the sharper the answers",
    body: "Add your monthly income, a debt or savings goal, and a stock or two to your watchlist on the dashboard -- the budget, savings, and debt agents use that real data instead of guessing.",
  },
];

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <OnboardingInner />
    </RequireAuth>
  );
}

function OnboardingInner() {
  const [step, setStep] = useState(0);
  const router = useRouter();
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const finish = () => router.push("/chat");

  return (
    <div className="mx-auto flex min-h-[calc(100vh-57px)] max-w-xl flex-col justify-center px-4 py-16">
      <div className="mb-8 flex items-center justify-center gap-2" aria-hidden="true">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              i === step ? "w-6 bg-white" : "w-1.5 bg-white/20"
            }`}
          />
        ))}
      </div>

      <p className="text-center text-xs font-medium uppercase tracking-wide text-white/50">
        {current.kicker}
      </p>
      <h1 className="mt-2 text-center text-2xl font-semibold sm:text-3xl">{current.title}</h1>

      {current.body && (
        <p className="mt-4 text-center text-white/70">{current.body}</p>
      )}

      {current.grid && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {current.grid.map((item) => (
            <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">{item.label}</p>
              <p className="mt-1 text-xs text-white/55">{item.hint}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={finish}
          className="text-sm text-white/50 hover:text-white/80"
        >
          Skip
        </button>
        <div className="flex gap-2">
          {step > 0 && (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="btn btn-ghost">
              <span>Back</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="btn btn-solid"
          >
            <span>{isLast ? "Start chatting" : "Next"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
