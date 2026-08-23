const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("fiscora_token");
}

export function setToken(token: string) {
  localStorage.setItem("fiscora_token", token);
}

export function clearToken() {
  localStorage.removeItem("fiscora_token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Can't reach Fiscora's server. Check your connection and try again.");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // response wasn't JSON
    }
    throw new Error(detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Auth ---
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export const signup = (email: string, password: string) =>
  request<TokenResponse>("/auth/signup", { method: "POST", body: JSON.stringify({ email, password }) });

export const login = (email: string, password: string) =>
  request<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

// --- Profile ---
export interface Profile {
  monthly_income: number;
  dependants: number;
  updated_at?: string;
}

export const getProfile = () => request<Profile>("/profile");
export const updateProfile = (payload: Partial<Profile>) =>
  request<Profile>("/profile", { method: "PUT", body: JSON.stringify(payload) });

// --- Watchlist ---
export interface WatchlistItem {
  id: number;
  ticker: string;
  notes?: string;
  added_at: string;
}

export const getWatchlist = () => request<WatchlistItem[]>("/watchlist");
export const addWatchlistItem = (ticker: string, notes?: string) =>
  request<WatchlistItem>("/watchlist", { method: "POST", body: JSON.stringify({ ticker, notes }) });
export const removeWatchlistItem = (id: number) =>
  request<void>(`/watchlist/${id}`, { method: "DELETE" });

// --- Goals ---
export interface Goal {
  id: number;
  name: string;
  goal_type: "savings" | "debt";
  target_amount: number;
  current_amount: number;
  interest_rate?: number;
  min_payment?: number;
  status: string;
}

export const getGoals = () => request<Goal[]>("/goals");
export const addGoal = (payload: Omit<Goal, "id" | "status">) =>
  request<Goal>("/goals", { method: "POST", body: JSON.stringify(payload) });
export const removeGoal = (id: number) => request<void>(`/goals/${id}`, { method: "DELETE" });

// --- Transactions ---
export interface Transaction {
  id: number;
  date: string;
  category: string;
  amount: number;
}

export const getTransactions = () => request<Transaction[]>("/transactions");

// --- CSV upload ---
export interface UploadCsvResponse {
  transactions_ingested: number;
  category_totals: { Category: string; Amount: number }[];
}

export const uploadCsv = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  return request<UploadCsvResponse>("/upload-csv", { method: "POST", body: formData });
};

// --- Chat (streaming) ---
export interface ChatChunk {
  /** Specialist agent name that produced this delta, or null for the coordinator's own synthesis. */
  agent: string | null;
  content: string;
}

/**
 * Parses a newline-delimited-JSON stream, buffering partial lines across
 * chunk boundaries (a single `reader.read()` result can contain a partial
 * line, multiple lines, or both -- fetch makes no line-boundary guarantee).
 */
function parseNdjsonLines(buffer: string, onChunk: (chunk: ChatChunk) => void): string {
  const parts = buffer.split("\n");
  const remainder = parts.pop() ?? "";
  for (const line of parts) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (typeof parsed.content === "string") {
        onChunk({ agent: typeof parsed.agent === "string" ? parsed.agent : null, content: parsed.content });
      }
    } catch {
      // Malformed line (shouldn't happen against our own backend) -- skip
      // rather than crash the whole stream over one bad chunk.
    }
  }
  return remainder;
}

export async function streamChat(
  message: string,
  sessionId: string | null,
  onChunk: (chunk: ChatChunk) => void
): Promise<string> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  } catch {
    throw new Error("Can't reach Fiscora's server. Check your connection and try again.");
  }

  if (!res.ok || !res.body) {
    let detail = res.status === 401 ? "Your session expired -- please log in again." : res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || detail;
    } catch {
      // not JSON
    }
    throw new Error(detail);
  }

  const returnedSessionId = res.headers.get("X-Session-Id") || sessionId || "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = parseNdjsonLines(buffer, onChunk);
    }
    buffer += decoder.decode();
    parseNdjsonLines(buffer + "\n", onChunk);
  } catch {
    throw new Error("The connection dropped mid-response. Your message was sent -- try asking again.");
  }

  return returnedSessionId;
}
