import { NextResponse } from "next/server";
import { entryInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteEntry, getEntry, updateEntry } from "@/lib/repo/entries";

interface Params {
  params: Promise<{ carId: string; entryId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { carId, entryId } = await params;
  const entry = await getEntry(carId, entryId);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = entryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { carId, entryId } = await params;
  try {
    const entry = await updateEntry(carId, entryId, parsed.data);
    return NextResponse.json({ entry });
  } catch {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { carId, entryId } = await params;
  await deleteEntry(carId, entryId);
  return new NextResponse(null, { status: 204 });
}
