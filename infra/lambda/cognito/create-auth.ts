import { randomInt } from "node:crypto";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import type { CreateAuthChallengeTriggerHandler } from "aws-lambda";

const ses = new SESv2Client({});
const FROM_EMAIL = process.env.FROM_EMAIL!;
const CODE_PREFIX = "CODE-";

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

async function sendCode(email: string, code: string): Promise<void> {
  await ses.send(
    new SendEmailCommand({
      FromEmailAddress: FROM_EMAIL,
      Destination: { ToAddresses: [email] },
      Content: {
        Simple: {
          Subject: { Data: "Your Car Maintenance Log sign-in code" },
          Body: {
            Text: {
              Data: `Your sign-in code is ${code}.\n\nIt expires in a few minutes. If you didn't request this, you can ignore this email.`,
            },
          },
        },
      },
    })
  );
}

export const handler: CreateAuthChallengeTriggerHandler = async (event) => {
  const session = event.request.session ?? [];
  const previousRound = session[session.length - 1];
  const reusedCode = previousRound?.challengeMetadata?.startsWith(CODE_PREFIX)
    ? previousRound.challengeMetadata.slice(CODE_PREFIX.length)
    : undefined;

  // Reuse the code from the previous round on a retry (wrong-but-not-
  // locked-out attempt) rather than generating and emailing a new one —
  // Cognito re-invokes this trigger once per DefineAuthChallenge round even
  // when the user is just being asked to try the same code again.
  const code = reusedCode ?? generateCode();
  if (!reusedCode) {
    const email = event.request.userAttributes.email;
    if (!email) throw new Error("User has no email attribute");
    await sendCode(email, code);
  }

  event.response.publicChallengeParameters = {};
  event.response.privateChallengeParameters = { answer: code };
  event.response.challengeMetadata = `${CODE_PREFIX}${code}`;
  return event;
};
