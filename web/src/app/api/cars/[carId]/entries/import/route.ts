import { NextResponse } from "next/server";
import { getCar } from "@/lib/repo/cars";
import { createEntries } from "@/lib/repo/entries";
import { entryImportSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: Request, { params }: { params: Promise<{ carId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = entryImportSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { carId } = await params;
  const car = await getCar(carId);
  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });

  const entries = await createEntries(carId, parsed.data.entries, user.email);
  return NextResponse.json({ imported: entries.length }, { status: 201 });
}
