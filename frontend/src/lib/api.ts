const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// --- Access token storage ---
// Held in memory only (never localStorage/sessionStorage) so it isn't
// readable by a stray XSS payload that dumps storage. Lost on full page
// reload by design -- auth-context.tsx recovers it via a silent call to
// /api/auth/refresh on mount, which rides the httpOnly refresh-token
// cookie set by the Next.js proxy routes in app/api/auth/*.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Called when a refresh attempt definitively fails (not "network blip" --
// "the session is over"), so auth-context can clear its state and redirect
// to /login. Registered by AuthProvider; kept as a plain callback rather
// than an import cycle back into the context module.
let onAuthExpired: (() => void) | null = null;

export function setAuthExpiredHandler(handler: (() => void) | null) {
  onAuthExpired = handler;
}

// --- Network retry (connectivity failures only) ---
// Retries only when fetch() itself throws (DNS/connection failure, offline,
// CORS preflight failure, etc.) -- never for a successful response that
// merely carries a 4xx/5xx status, which is the caller's business logic to
// handle, not something backoff-and-retry can fix.
async function fetchWithRetry(url: string, init: RequestInit, retries = 2, delayMs = 300): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return fetchWithRetry(url, init, retries - 1, delayMs * 2);
  }
}

// --- Refresh single-flight ---
// If several requests 401 at the same moment (e.g. a page fires off
// parallel fetches right as the access token expires), only one of them
// should call /api/auth/refresh. The backend's refresh token rotates on
// every use and revokes the whole session on reuse of an already-rotated
// token, so firing concurrent refreshes would self-inflict a logout.
let refreshInFlight: Promise<string | null> | null = null;

// Thrown when /api/auth/refresh fails in a way that says nothing about
// whether the session itself is still valid (429 rate-limited -- see
// backend/api/routers/auth.py's REFRESH_RATE_LIMIT -- or a transient 5xx).
// Callers should surface this as "try again", not force a logout: only a
// genuine 401 (refreshAccessToken() resolving to null) means the session is
// actually dead.
export class RetryableAuthError extends Error {}

async function attemptRefresh(allowRetry: boolean): Promise<string | null> {
  let res: Response;
  try {
    res = await fetchWithRetry("/api/auth/refresh", { method: "POST" });
  } catch {
    // Network failure even after fetchWithRetry's own backoff -- give up
    // quietly rather than force a logout over connectivity, but don't keep
    // retrying indefinitely either.
    accessToken = null;
    return null;
  }

  if (res.status === 401) {
    // Genuine session death: the refresh token was expired, revoked, or
    // reuse-detected and the backend killed the whole session.
    accessToken = null;
    return null;
  }

  if (!res.ok) {
    // 429 or 5xx -- the refresh token itself may still be perfectly valid.
    // Don't touch accessToken and don't force logout: one quiet retry after
    // a short delay, then surface a retryable error for the caller's
    // current request rather than treating "server is busy" as "you're
    // logged out".
    if (allowRetry) {
      await new Promise((resolve) => setTimeout(resolve, 750));
      return attemptRefresh(false);
    }
    throw new RetryableAuthError("Fiscora's server is busy right now -- please try again in a moment.");
  }

  const data = await res.json();
  accessToken = data.access_token as string;
  return accessToken;
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = attemptRefresh(true).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestInit = {}, _isRetry = false): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let res: Response;
  try {
    res = await fetchWithRetry(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error("Can't reach Fiscora's server. Check your connection and try again.");
  }

  if (res.status === 401 && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
    onAuthExpired?.();
    throw new Error("Your session expired -- please log in again.");
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
// These hit the Next.js proxy routes (app/api/auth/*), never FastAPI
// directly: the proxy is what sets/reads the httpOnly refresh-token cookie.
// The refresh_token itself never reaches this module or any client code.
export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function authProxyRequest(path: string, body: unknown): Promise<AuthResponse> {
  let res: Response;
  try {
    res = await fetchWithRetry(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach Fiscora's server. Check your connection and try again.");
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || res.statusText);
  }
  return data as AuthResponse;
}

export async function signup(email: string, password: string): Promise<AuthResponse> {
  const data = await authProxyRequest("/api/auth/signup", { email, password });
  accessToken = data.access_token;
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const data = await authProxyRequest("/api/auth/login", { email, password });
  accessToken = data.access_token;
  return data;
}

export async function logout(): Promise<void> {
  accessToken = null;
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Best-effort revoke -- the local access token is already cleared above,
    // so the client-side session ends regardless of backend reachability.
  }
}

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

// streamChat doesn't go through request() (it needs the raw Response body
// for streaming), so it duplicates the 401-refresh-retry dance rather than
// sharing request()'s implementation.
export async function streamChat(
  message: string,
  sessionId: string | null,
  onChunk: (chunk: ChatChunk) => void,
  _isRetry = false
): Promise<string> {
  let res: Response;
  try {
    res = await fetchWithRetry(`${API_URL}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  } catch {
    throw new Error("Can't reach Fiscora's server. Check your connection and try again.");
  }

  if (res.status === 401 && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return streamChat(message, sessionId, onChunk, true);
    }
    onAuthExpired?.();
    throw new Error("Your session expired -- please log in again.");
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
