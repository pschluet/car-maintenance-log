import { NextResponse } from "next/server";
import { presignDownload } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

/** Stable, cookie-authenticated attachment URL: re-signs on every request
 * and redirects, so `<img src>` never goes stale the way a presigned URL
 * baked in at render time would. See web/src/lib/attachment-url.ts.
 *
 * Every signed-in user can see every car's attachments (this is a shared
 * household garage, not per-user data), so the only check here is "is
 * anyone signed in." */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key?.startsWith("cars/")) {
    return NextResponse.json({ error: "Missing or invalid ?key=" }, { status: 400 });
  }

  const url = await presignDownload(key);
  const res = NextResponse.redirect(url, 302);
  // The redirect target itself expires; the redirect response must not be
  // cached past the moment it's issued, or a browser/CDN could replay a
  // dead link instead of asking this route to mint a fresh one.
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
