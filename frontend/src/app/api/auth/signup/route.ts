import { NextRequest, NextResponse } from "next/server";
import {
  forwardToBackend,
  publicTokenBody,
  REFRESH_COOKIE,
  refreshCookieOptions,
  upstreamUnreachable,
} from "../_shared";

export async function POST(request: NextRequest) {
  const payload = await request.json();

  let backendRes: Response;
  try {
    backendRes = await forwardToBackend("/auth/signup", payload);
  } catch {
    return upstreamUnreachable();
  }

  const data = await backendRes.json().catch(() => ({}));
  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const response = NextResponse.json(publicTokenBody(data));
  response.cookies.set(REFRESH_COOKIE, data.refresh_token, refreshCookieOptions());
  return response;
}
