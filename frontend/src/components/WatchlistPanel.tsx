"use client";

import { FormEvent, useState } from "react";
import { addWatchlistItem, removeWatchlistItem, type WatchlistItem } from "@/lib/api";

interface Props {
  items: WatchlistItem[];
  onChange: () => void;
}

export default function WatchlistPanel({ items, onChange }: Props) {
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await addWatchlistItem(ticker.trim());
      setTicker("");
      onChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that ticker -- check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: number) => {
    await removeWatchlistItem(id);
    onChange();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-medium text-white/70">Watchlist</h3>

      <form onSubmit={handleAdd} className="mb-3 flex gap-2">
        <input
          value={ticker}
          onChange={(e) => setTicker(e.target.value)}
          placeholder="e.g. AAPL"
          aria-label="Stock ticker symbol"
          className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs uppercase outline-none focus:border-white/40"
        />
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-2 text-xs text-red-400">
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-xs text-white/55">
          No tickers yet -- add a symbol above to start tracking it, or ask the chat to compare a
          few stocks and it&apos;ll offer to add the winner here.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-md bg-white/5 px-2.5 py-1.5 text-sm"
            >
              <span className="font-medium">{item.ticker}</span>
              <button
                onClick={() => handleRemove(item.id)}
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
