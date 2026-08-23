/**
 * Shared helpers for the Next.js auth proxy routes (app/api/auth/*).
 *
 * These routes are the ONLY thing that ever sees the refresh token: they
 * call the FastAPI backend's JSON auth endpoints server-side, then hand the
 * browser an httpOnly/Secure/SameSite=Strict cookie instead of the raw
 * token. The access token (short-lived, low blast radius) is the only auth
 * material returned to client JS, to be kept in memory -- see
 * frontend/src/lib/api.ts.
 *
 * Not named route.ts, so Next.js does not treat this as a routable segment.
 */
import { NextResponse } from "next/server";

export const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export const REFRESH_COOKIE = "fiscora_refresh_token";

// Backend refresh tokens are currently long-lived (days); we don't know the
// exact TTL from the token response, so cap the cookie at a conservative
// 30 days. The backend is the source of truth for actual expiry/revocation
// either way -- an over-long cookie just means "browser may still have it,"
// not "session is still valid."
export const REFRESH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

/** Scoped to /api/auth so the browser only ever sends this cookie back to
 * these proxy routes, never to arbitrary app pages or FastAPI directly. */
export function refreshCookieOptions(maxAgeSeconds: number = REFRESH_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/api/auth",
    maxAge: maxAgeSeconds,
  };
}

export async function forwardToBackend(path: string, body: unknown): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** A failed /auth/refresh call only proves the refresh token itself is dead
 * on a genuine 401 (invalid, revoked, or reuse-detected -- the backend has
 * killed the whole session). A 429 (rate-limited, see backend/api/routers/
 * auth.py's REFRESH_RATE_LIMIT) or 5xx (transient backend issue) says
 * nothing about the token's validity -- treating those the same as a 401
 * would log a real user out over a blip that has nothing to do with
 * whether their session is still good. */
export function isRefreshTokenDead(status: number): boolean {
  return status === 401;
}

export function upstreamUnreachable() {
  return NextResponse.json(
    { detail: "Can't reach Fiscora's server. Check your connection and try again." },
    { status: 502 }
  );
}

interface BackendTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

/** Strips refresh_token out of a backend TokenResponse before it goes to
 * the browser -- the browser only ever gets the access token. */
export function publicTokenBody(data: BackendTokenResponse) {
  return {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
  };
}
