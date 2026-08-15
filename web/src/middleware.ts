import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyIdToken } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";

// Everything except these paths requires a valid session. These four are
// the only endpoints a signed-out visitor needs to reach: read the login
// page, request/answer the email OTP, or attempt a silent refresh.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/start",
  "/api/auth/verify",
  "/api/auth/refresh",
  "/api/health",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p);
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin")
  );
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const idToken = req.cookies.get(COOKIE.id)?.value;
  const user = await verifyIdToken(idToken);
  const base = siteOrigin(req.nextUrl.origin);

  if (!user) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // The refresh token can't be verified at the edge (that requires the
    // AWS SDK, which needs the Node.js runtime), so page loads take a
    // detour through the Node-runtime refresh route: it rotates the
    // cookies if the refresh token is still valid, then bounces back here.
    const hasRefresh = req.cookies.get(COOKIE.refresh)?.value;
    const target = new URL(hasRefresh ? "/api/auth/refresh" : "/login", base);
    target.searchParams.set("next", pathname + search);
    return NextResponse.redirect(target);
  }

  if (isAdminPath(pathname) && !user.isAdmin) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", base));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
