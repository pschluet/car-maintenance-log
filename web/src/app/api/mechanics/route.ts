import { NextResponse } from "next/server";
import { mechanicInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { createMechanic, listMechanics } from "@/lib/repo/mechanics";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const mechanics = await listMechanics();
  return NextResponse.json({ mechanics });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = mechanicInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const mechanic = await createMechanic(parsed.data);
  return NextResponse.json({ mechanic }, { status: 201 });
}
