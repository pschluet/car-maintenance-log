import { NextResponse, type NextRequest } from "next/server";
import { refreshTokens } from "@/lib/cognito";
import { clearSessionCookies, getRefreshToken, setSessionCookies } from "@/lib/session";

// `next` arrives on the query string of this public route, so only honor it
// when it's a local path (a single leading "/", not "//" or "/\", which the
// browser would treat as a scheme-relative URL to another origin). This both
// prevents an open redirect and keeps the Location relative so the browser
// resolves it against the real origin rather than the server's 0.0.0.0 host.
function safeNext(raw: string | null): string {
  if (!raw?.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return "/";
  }
  return raw;
}

function redirectTo(path: string): NextResponse {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  const result = await refreshTokens(refreshToken);
  if (!result) return false;
  await setSessionCookies({ ...result, refreshToken: undefined });
  return true;
}

/** Used by page-load redirects from middleware: rotate cookies, then bounce
 * back to wherever the visitor was headed. */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const ok = await doRefresh();
  if (!ok) await clearSessionCookies();
  return redirectTo(ok ? next : "/login");
}

/** Used by the client-side apiFetch retry-on-401 path: rotate cookies and
 * report success/failure as JSON so the caller can retry in place. */
export async function POST() {
  const ok = await doRefresh();
  if (!ok) {
    await clearSessionCookies();
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
