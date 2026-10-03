import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth } from "@/lib/security/basic-auth";

/**
 * Gates the whole app (pages and API routes) behind one shared password
 * (APP_PASSWORD) using the browser's built-in login prompt. Without this,
 * every route - including the ones that spend AI credit and edit data - was
 * public.
 *
 * - Production with APP_PASSWORD unset: blocked with a clear message (fail
 *   closed), so a deploy can never be accidentally open.
 * - Development / tests with APP_PASSWORD unset: open, for local convenience.
 */
export function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const decision = checkBasicAuth(request.headers.get("authorization"), password);

  if (decision === "ok") return NextResponse.next();

  if (decision === "not-configured") {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse(
      "This app is locked because APP_PASSWORD is not set. Add APP_PASSWORD in the hosting environment variables and redeploy.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
    );
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Content Intelligence", charset="UTF-8"' }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
