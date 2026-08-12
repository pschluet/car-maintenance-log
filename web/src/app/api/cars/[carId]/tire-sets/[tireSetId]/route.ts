import { NextResponse } from "next/server";
import { tireSetInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteTireSet, updateTireSet } from "@/lib/repo/cars";

interface Params {
  params: Promise<{ carId: string; tireSetId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = tireSetInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { carId, tireSetId } = await params;
  const tireSet = await updateTireSet(carId, tireSetId, parsed.data);
  return NextResponse.json({ tireSet });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { carId, tireSetId } = await params;
  await deleteTireSet(carId, tireSetId);
  return new NextResponse(null, { status: 204 });
}
