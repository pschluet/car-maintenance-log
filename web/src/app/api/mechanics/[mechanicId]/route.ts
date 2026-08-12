import { NextResponse } from "next/server";
import { mechanicInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteMechanic, updateMechanic } from "@/lib/repo/mechanics";

interface Params {
  params: Promise<{ mechanicId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = mechanicInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { mechanicId } = await params;
  const mechanic = await updateMechanic(mechanicId, parsed.data);
  return NextResponse.json({ mechanic });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { mechanicId } = await params;
  await deleteMechanic(mechanicId);
  return new NextResponse(null, { status: 204 });
}
