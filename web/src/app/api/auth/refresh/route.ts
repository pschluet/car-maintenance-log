import { NextResponse, type NextRequest } from "next/server";
import { refreshTokens } from "@/lib/cognito";
import { clearSessionCookies, getRefreshToken, setSessionCookies } from "@/lib/session";

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
  const next = req.nextUrl.searchParams.get("next") || "/";
  const ok = await doRefresh();
  if (!ok) await clearSessionCookies();
  return NextResponse.redirect(new URL(ok ? next : "/login", req.url));
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
