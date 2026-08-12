import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { handler as HandlerType } from "../lambda/cognito/create-auth";

const sendMock = vi.fn().mockResolvedValue({});
vi.mock("@aws-sdk/client-sesv2", () => ({
  SESv2Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  SendEmailCommand: vi.fn().mockImplementation((input) => input),
}));

process.env.FROM_EMAIL = "no-reply@pauldev.io";

// Imported inside beforeAll (rather than a top-level await) so this file
// stays compatible with the infra project's CommonJS tsconfig, which
// `tsc --noEmit` enforces even though vitest itself would run either form.
let handler: typeof HandlerType;

beforeAll(async () => {
  ({ handler } = await import("../lambda/cognito/create-auth"));
});

function makeEvent(session: Array<{ challengeMetadata?: string }>) {
  return {
    request: { session, userAttributes: { email: "driver@example.com" } },
    response: {},
  } as unknown as Parameters<typeof handler>[0];
}

beforeEach(() => {
  sendMock.mockClear();
});

describe("create-auth", () => {
  it("generates a 6-digit code and emails it on the first round", async () => {
    const event = await handler(makeEvent([]), {} as never, () => {});
    const code = event!.response.privateChallengeParameters.answer;
    expect(code).toMatch(/^\d{6}$/);
    expect(event!.response.challengeMetadata).toBe(`CODE-${code}`);
    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it("never leaks the code via publicChallengeParameters", async () => {
    const event = await handler(makeEvent([]), {} as never, () => {});
    expect(event!.response.publicChallengeParameters).not.toHaveProperty("answer");
  });

  it("reuses the previous round's code on a retry without sending another email", async () => {
    const event = await handler(
      makeEvent([{ challengeMetadata: "CODE-042017" }]),
      {} as never,
      () => {}
    );
    expect(event!.response.privateChallengeParameters.answer).toBe("042017");
    expect(sendMock).not.toHaveBeenCalled();
  });
});
