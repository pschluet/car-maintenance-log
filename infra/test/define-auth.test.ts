import { describe, expect, it } from "vitest";
import { handler } from "../lambda/cognito/define-auth";

// Minimal shape matching the parts of the real Cognito DefineAuthChallenge
// event this trigger reads/writes.
function makeEvent(session: Array<{ challengeName: string; challengeResult: boolean }>) {
  return {
    request: { session },
    response: {},
  } as unknown as Parameters<typeof handler>[0];
}

describe("define-auth", () => {
  it("starts a CUSTOM_CHALLENGE on the first round", async () => {
    const event = await handler(makeEvent([]), {} as never, () => {});
    expect(event!.response.challengeName).toBe("CUSTOM_CHALLENGE");
    expect(event!.response.issueTokens).toBe(false);
    expect(event!.response.failAuthentication).toBe(false);
  });

  it("issues tokens once the most recent round succeeded", async () => {
    const event = await handler(
      makeEvent([{ challengeName: "CUSTOM_CHALLENGE", challengeResult: true }]),
      {} as never,
      () => {}
    );
    expect(event!.response.issueTokens).toBe(true);
    expect(event!.response.failAuthentication).toBe(false);
  });

  it("offers a retry after one or two wrong answers", async () => {
    const event = await handler(
      makeEvent([{ challengeName: "CUSTOM_CHALLENGE", challengeResult: false }]),
      {} as never,
      () => {}
    );
    expect(event!.response.challengeName).toBe("CUSTOM_CHALLENGE");
    expect(event!.response.failAuthentication).toBe(false);
  });

  it("locks out after 3 failed attempts", async () => {
    const event = await handler(
      makeEvent([
        { challengeName: "CUSTOM_CHALLENGE", challengeResult: false },
        { challengeName: "CUSTOM_CHALLENGE", challengeResult: false },
        { challengeName: "CUSTOM_CHALLENGE", challengeResult: false },
      ]),
      {} as never,
      () => {}
    );
    expect(event!.response.failAuthentication).toBe(true);
    expect(event!.response.issueTokens).toBe(false);
  });
});
