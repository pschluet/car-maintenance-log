import { NextResponse } from "next/server";
import { presignRequestSchema } from "@/lib/schemas";
import { buildAttachmentKey, deleteObject, presignUpload } from "@/lib/s3";
import { getCurrentUser } from "@/lib/session";

/** Issues a presigned PUT URL so the browser can upload directly to S3.
 * Lambda's request payload cap (6 MB) makes proxying uploads through the
 * server a non-starter for phone photos. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = presignRequestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { fileName, contentType, carId, kind } = parsed.data;
  const s3Key = buildAttachmentKey(carId, kind, fileName);
  const uploadUrl = await presignUpload(s3Key, contentType);
  return NextResponse.json({ uploadUrl, s3Key });
}

/** Deletes an attachment object directly, for files uploaded but never
 * attached to a saved record — e.g. an entry-form attachment removed (or a
 * whole entry cancelled) before the form was saved. Attachments already on
 * a saved record are deleted through their owning resource instead (see
 * repo/entries.ts and repo/cars.ts), which is what actually removes the
 * reference to them. */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = new URL(req.url).searchParams.get("key");
  if (!key?.startsWith("cars/")) {
    return NextResponse.json({ error: "Missing or invalid ?key=" }, { status: 400 });
  }

  await deleteObject(key);
  return new NextResponse(null, { status: 204 });
}
