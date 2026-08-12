import { NextResponse } from "next/server";
import { startAuth } from "@/lib/cognito";
import { startAuthSchema } from "@/lib/schemas";
import { setChallengeCookies } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = startAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const { email } = parsed.data;

  try {
    const { session } = await startAuth(email);
    await setChallengeCookies(session, email);
  } catch {
    // Swallow errors here (including "no such user") so this endpoint never
    // reveals whether an email address has an account. The verify step
    // will fail harmlessly if no challenge cookie was actually set.
  }

  return NextResponse.json({ ok: true });
}
