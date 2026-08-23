/**
 * Confirms refreshAccessToken() distinguishes a genuine dead session (401)
 * from a transient/retryable failure (429 rate-limited, 5xx) -- see
 * frontend/src/app/api/auth/refresh/route.ts and backend/api/routers/
 * auth.py's REFRESH_RATE_LIMIT for the server side of this same fix.
 *
 * Run with: npx tsx --test src/lib/api.refresh.test.ts (from frontend/).
 */
import test from "node:test";
import assert from "node:assert/strict";

import { getAccessToken, refreshAccessToken, RetryableAuthError, setAccessToken } from "./api";

function mockFetchOnce(status: number, body: unknown) {
  return async () => new Response(JSON.stringify(body), { status });
}

test("refreshAccessToken: 401 is a genuine dead session -- clears the token and resolves null", async () => {
  setAccessToken("old-token");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchOnce(401, { detail: "Refresh token has been revoked" });
  try {
    const result = await refreshAccessToken();
    assert.equal(result, null);
    assert.equal(getAccessToken(), null, "401 must clear the in-memory access token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("refreshAccessToken: 429 is retryable -- does NOT clear the token, does NOT resolve null, throws RetryableAuthError", async () => {
  setAccessToken("old-token");
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ detail: "Rate limit exceeded" }), { status: 429 });
  };
  try {
    await assert.rejects(() => refreshAccessToken(), RetryableAuthError);
    assert.equal(getAccessToken(), "old-token", "429 must not touch the in-memory access token");
    assert.equal(calls, 2, "one quiet retry before giving up");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("refreshAccessToken: 500 is retryable the same way as 429", async () => {
  setAccessToken("old-token");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchOnce(500, { detail: "Internal server error" });
  try {
    await assert.rejects(() => refreshAccessToken(), RetryableAuthError);
    assert.equal(getAccessToken(), "old-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("refreshAccessToken: happy path is unchanged -- success returns and stores the new access token", async () => {
  setAccessToken("old-token");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetchOnce(200, {
    access_token: "new-token",
    token_type: "bearer",
    expires_in: 900,
  });
  try {
    const result = await refreshAccessToken();
    assert.equal(result, "new-token");
    assert.equal(getAccessToken(), "new-token");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
