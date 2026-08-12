import { NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/cognito";
import { createUserInputSchema } from "@/lib/schemas";
import { getCurrentUser } from "@/lib/session";

// Middleware already blocks non-admins from /api/admin/*, but each handler
// re-checks so this file stays correct (and unit-testable) on its own.
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createUserInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  try {
    await createUser(parsed.data.email, parsed.data.isAdmin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create user";
    return NextResponse.json({ error: message }, { status: 409 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
