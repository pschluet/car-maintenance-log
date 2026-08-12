import { NextResponse } from "next/server";
import { deleteUser } from "@/lib/cognito";
import { getCurrentUser } from "@/lib/session";

export async function DELETE(_req: Request, { params }: { params: Promise<{ email: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { email } = await params;
  const target = decodeURIComponent(email);

  if (target.toLowerCase() === user.email.toLowerCase()) {
    return NextResponse.json({ error: "You can't remove your own account." }, { status: 400 });
  }

  await deleteUser(target);
  return new NextResponse(null, { status: 204 });
}
