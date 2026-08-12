import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/cognito";
import { verifyAuthSchema } from "@/lib/schemas";
import {
  clearChallengeCookies,
  getChallengeCookies,
  setChallengeCookies,
  setSessionCookies,
} from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = verifyAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const { session, email } = await getChallengeCookies();
  if (!session || !email) {
    return NextResponse.json({ error: "Your code expired. Request a new one." }, { status: 400 });
  }

  try {
    const result = await verifyAuth(email, session, parsed.data.code);
    if ("session" in result) {
      // Wrong code, but Cognito issued a fresh challenge session — attempts
      // remain, so let the user try again against the same email.
      await setChallengeCookies(result.session, email);
      return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
    }
    await setSessionCookies(result);
    await clearChallengeCookies();
    return NextResponse.json({ ok: true });
  } catch {
    await clearChallengeCookies();
    return NextResponse.json(
      { error: "Too many incorrect attempts. Request a new code." },
      { status: 400 }
    );
  }
}
