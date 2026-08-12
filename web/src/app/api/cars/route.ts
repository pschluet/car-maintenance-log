import { NextResponse } from "next/server";
import { carInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { createCar, listCars } from "@/lib/repo/cars";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cars = await listCars();
  return NextResponse.json({ cars });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = carInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const car = await createCar(parsed.data);
  return NextResponse.json({ car }, { status: 201 });
}
