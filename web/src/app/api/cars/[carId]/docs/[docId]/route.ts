import { NextResponse } from "next/server";
import { DOC_KINDS } from "@/lib/types";
import { getCurrentUser } from "@/lib/session";
import { deleteCarDoc } from "@/lib/repo/cars";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ carId: string; docId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const kind = new URL(req.url).searchParams.get("kind");
  if (!kind || !DOC_KINDS.includes(kind as (typeof DOC_KINDS)[number])) {
    return NextResponse.json({ error: "Missing or invalid ?kind=" }, { status: 400 });
  }

  const { carId, docId } = await params;
  await deleteCarDoc(carId, kind, docId);
  return new NextResponse(null, { status: 204 });
}
