import { NextResponse } from "next/server";

// Polled by the Lambda Web Adapter readiness check (AWS_LWA_READINESS_CHECK_PATH)
// before it starts forwarding invocations to this container, and usable as
// a plain uptime check locally. Deliberately has no dependencies (DB, S3,
// Cognito) — it should report "the Next.js server is up," not "every
// downstream service is healthy."
export async function GET() {
  return NextResponse.json({ ok: true });
}
