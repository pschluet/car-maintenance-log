import { NextResponse } from "next/server";
import { entryInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { createEntry, listEntries } from "@/lib/repo/entries";

export async function GET(_req: Request, { params }: { params: Promise<{ carId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { carId } = await params;
  const entries = await listEntries(carId);
  return NextResponse.json({ entries });
}

export async function POST(req: Request, { params }: { params: Promise<{ carId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = entryInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { carId } = await params;
  const entry = await createEntry(carId, parsed.data, user.email);
  return NextResponse.json({ entry }, { status: 201 });
}
