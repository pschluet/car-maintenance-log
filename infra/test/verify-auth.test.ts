import { describe, expect, it } from "vitest";
import { handler } from "../lambda/cognito/verify-auth";

function makeEvent(answer: string, challengeAnswer: string) {
  return {
    request: { privateChallengeParameters: { answer }, challengeAnswer },
    response: {},
  } as unknown as Parameters<typeof handler>[0];
}

describe("verify-auth", () => {
  it("accepts the correct code", async () => {
    const event = await handler(makeEvent("123456", "123456"), {} as never, () => {});
    expect(event!.response.answerCorrect).toBe(true);
  });

  it("rejects an incorrect code", async () => {
    const event = await handler(makeEvent("123456", "654321"), {} as never, () => {});
    expect(event!.response.answerCorrect).toBe(false);
  });

  it("rejects an answer of a different length instead of throwing", async () => {
    const event = await handler(makeEvent("123456", "1234567"), {} as never, () => {});
    expect(event!.response.answerCorrect).toBe(false);
  });

  it("rejects an empty answer", async () => {
    const event = await handler(makeEvent("123456", ""), {} as never, () => {});
    expect(event!.response.answerCorrect).toBe(false);
  });
});
