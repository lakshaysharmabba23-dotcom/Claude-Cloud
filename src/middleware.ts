import { NextResponse, type NextRequest } from "next/server";
import { checkBasicAuth } from "@/lib/security/basic-auth";

/**
 * Optional shared-password gate (HTTP Basic auth, the browser's built-in login
 * box) for the whole app, pages and API routes alike.
 *
 * - APP_PASSWORD set: every request needs it (any username).
 * - APP_PASSWORD not set: the app is open. That is fine for a sample-data
 *   demo; set APP_PASSWORD before pointing real credentials or private data at
 *   a public URL, because the routes that call the AI model are then reachable
 *   by anyone with the link (they are rate limited, but not locked).
 */
export function middleware(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const decision = checkBasicAuth(request.headers.get("authorization"), password);

  if (decision === "ok") return NextResponse.next();

  if (decision === "not-configured") return NextResponse.next();

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Content Intelligence", charset="UTF-8"' }
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
