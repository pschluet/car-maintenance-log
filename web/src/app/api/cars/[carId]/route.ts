import { NextResponse } from "next/server";
import { carInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";
import { deleteCar, getCarWithDetails, updateCar } from "@/lib/repo/cars";

interface Params {
  params: Promise<{ carId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { carId } = await params;
  const car = await getCarWithDetails(carId);
  if (!car) return NextResponse.json({ error: "Car not found" }, { status: 404 });
  return NextResponse.json({ car });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = carInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { carId } = await params;
  try {
    const car = await updateCar(carId, parsed.data);
    return NextResponse.json({ car });
  } catch {
    return NextResponse.json({ error: "Car not found" }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { carId } = await params;
  await deleteCar(carId);
  return new NextResponse(null, { status: 204 });
}
