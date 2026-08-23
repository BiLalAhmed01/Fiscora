"use client";

import { FormEvent, useState } from "react";
import { updateProfile, type Profile } from "@/lib/api";

interface Props {
  profile: Profile;
  onChange: () => void;
}

export default function ProfilePanel({ profile, onChange }: Props) {
  const [income, setIncome] = useState(String(profile.monthly_income));
  const [dependants, setDependants] = useState(String(profile.dependants));
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        monthly_income: parseFloat(income) || 0,
        dependants: parseInt(dependants, 10) || 0,
      });
      onChange();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-medium text-white/70">Household</h3>
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-xs text-white/55">Monthly income ($)</label>
          <input
            type="number"
            min="0"
            step="100"
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-white/40"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/55">Dependants</label>
          <input
            type="number"
            min="0"
            step="1"
            value={dependants}
            onChange={(e) => setDependants(e.target.value)}
            className="w-full rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-sm outline-none focus:border-white/40"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
