import { NextResponse, type NextRequest } from "next/server";

// Cheap pre-check (no network). Visitors with no session cookie are simply not
// logged in, so they go to a clean /login (no "unauthorized" error). A session
// that exists but is invalid or non-admin is rejected later by <AdminGate />,
// which does add ?error=unauthorized. The backend still authorizes every call.
export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has("better-auth.session_token") ||
    request.cookies.has("__Secure-better-auth.session_token");

  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = hasSession ? "/dashboard" : "/login";

  // The bare root skips the extra hop through app/page.tsx.
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(url);
  }

  if (!hasSession) {
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
