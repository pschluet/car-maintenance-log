import { NextResponse } from "next/server";
import { presignDownload } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

/** Issues a presigned GET URL for an attachment. Every signed-in user can
 * see every car's attachments (this is a shared household garage, not
 * per-user data), so the only check here is "is anyone signed in." */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key?.startsWith("cars/")) {
    return NextResponse.json({ error: "Missing or invalid ?key=" }, { status: 400 });
  }

  const url = await presignDownload(key);
  return NextResponse.json({ url });
}
