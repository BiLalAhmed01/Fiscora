import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  forwardToBackend,
  publicTokenBody,
  REFRESH_COOKIE,
  refreshCookieOptions,
  upstreamUnreachable,
} from "../_shared";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "No active session" }, { status: 401 });
  }

  let backendRes: Response;
  try {
    backendRes = await forwardToBackend("/auth/refresh", { refresh_token: refreshToken });
  } catch {
    // Transient network failure -- leave the cookie alone, the caller can retry.
    return upstreamUnreachable();
  }

  const data = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    // The refresh token itself was rejected (expired, revoked, or reuse
    // detected and the whole family was killed server-side). It's dead
    // either way -- clear the cookie so we don't keep sending a token that
    // will trip reuse-detection on a future attempt.
    const response = NextResponse.json(data, { status: backendRes.status });
    response.cookies.delete({ name: REFRESH_COOKIE, path: "/api/auth" });
    return response;
  }

  // The refresh token rotates on every use -- the one we just sent is now
  // dead. Persist the new one immediately or the next refresh will fail.
  const response = NextResponse.json(publicTokenBody(data));
  response.cookies.set(REFRESH_COOKIE, data.refresh_token, refreshCookieOptions());
  return response;
}
