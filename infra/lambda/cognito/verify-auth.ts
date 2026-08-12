import { timingSafeEqual } from "node:crypto";
import type { VerifyAuthChallengeResponseTriggerHandler } from "aws-lambda";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on mismatched lengths, which a 6-digit code
  // vs. an attacker-supplied answer of arbitrary length will frequently
  // have — treat that as "not equal" rather than letting it throw.
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const handler: VerifyAuthChallengeResponseTriggerHandler = async (event) => {
  const expected = event.request.privateChallengeParameters.answer ?? "";
  const provided = event.request.challengeAnswer ?? "";
  event.response.answerCorrect = safeEqual(expected, provided);
  return event;
};
