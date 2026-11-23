import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: sends visitors without a session cookie to the login page.
// Real authorisation (is the session valid, is it the right role, does this parent
// own this student?) happens on the server in every page, action and route handler.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("mht_session")) {
    const url = new URL("/", request.url);
    if (request.nextUrl.pathname.startsWith("/admin")) url.searchParams.set("peranan", "admin");
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/ibu-bapa/:path*", "/selamat-datang"],
};
