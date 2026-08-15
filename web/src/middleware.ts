import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyIdToken } from "@/lib/session";

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

// Emit a relative Location so the browser resolves it against the address-bar
// origin (cars.pauldev.io in prod, localhost in dev). Building an absolute URL
// from req.url is wrong behind CloudFront + the Lambda Function URL: the public
// Host header is stripped by the origin-request policy, so req.url falls back to
// the standalone server's own 0.0.0.0:PORT bind authority — which the browser
// then refuses to open ("restricted network port"). NextResponse.redirect()
// rejects a non-absolute URL, so set the header directly.
function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const idToken = req.cookies.get(COOKIE.id)?.value;
  const user = await verifyIdToken(idToken);

  if (!user) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // The refresh token can't be verified at the edge (that requires the
    // AWS SDK, which needs the Node.js runtime), so page loads take a
    // detour through the Node-runtime refresh route: it rotates the
    // cookies if the refresh token is still valid, then bounces back here.
    const hasRefresh = req.cookies.get(COOKIE.refresh)?.value;
    const next = encodeURIComponent(pathname + search);
    if (hasRefresh) {
      return redirectTo(`/api/auth/refresh?next=${next}`);
    }
    return redirectTo(`/login?next=${next}`);
  }

  if (isAdminPath(pathname) && !user.isAdmin) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return redirectTo("/");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
