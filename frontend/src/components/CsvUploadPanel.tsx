"use client";

import { ChangeEvent, useRef, useState } from "react";
import { uploadCsv } from "@/lib/api";
import { track } from "@/lib/analytics";

interface Props {
  onUploaded: () => void;
}

export default function CsvUploadPanel({ onUploaded }: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setStatus(null);
    setIsUploading(true);
    try {
      const result = await uploadCsv(file);
      setStatus(`Imported ${result.transactions_ingested} transactions.`);
      onUploaded();
      track("csv_uploaded", { transactions: result.transactions_ingested });
      if (!localStorage.getItem("fiscora_first_csv_uploaded")) {
        localStorage.setItem("fiscora_first_csv_uploaded", "1");
        track("first_csv_uploaded");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <h3 className="mb-1 text-sm font-medium text-white/70">Upload transactions</h3>
      <p className="mb-3 text-xs text-white/55">
        CSV with columns: Date (YYYY-MM-DD), Category, Amount
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        disabled={isUploading}
        aria-label="Upload transactions CSV file"
        className="block w-full text-xs text-white/50 file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-black hover:file:bg-white/90 disabled:opacity-60"
      />
      {isUploading && (
        <p className="mt-2 flex items-center gap-2 text-xs text-white/70" role="status">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Uploading and parsing your transactions...
        </p>
      )}
      {status && !isUploading && (
        <p className="mt-2 text-xs text-white" role="status">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
