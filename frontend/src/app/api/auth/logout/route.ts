import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { forwardToBackend, REFRESH_COOKIE } from "../_shared";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (refreshToken) {
    try {
      await forwardToBackend("/auth/logout", { refresh_token: refreshToken });
    } catch {
      // Best-effort revoke -- still clear the browser's cookie below so the
      // client-side session ends even if the backend is unreachable.
    }
  }

  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete({ name: REFRESH_COOKIE, path: "/api/auth" });
  return response;
}
