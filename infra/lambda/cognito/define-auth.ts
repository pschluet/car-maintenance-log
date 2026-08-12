import type { DefineAuthChallengeTriggerHandler } from "aws-lambda";

// TODO.md calls for a six-character sign-in token, which Cognito's built-in
// email-OTP first factor doesn't support (no length setting) — so this app
// runs the classic three-Lambda CUSTOM_AUTH flow instead. This trigger is
// the state machine: it decides, after each round, whether to issue
// tokens, ask for another attempt, or lock the session out.
const MAX_ATTEMPTS = 3;

export const handler: DefineAuthChallengeTriggerHandler = async (event) => {
  const session = event.request.session ?? [];

  if (session.length === 0) {
    event.response.issueTokens = false;
    event.response.failAuthentication = false;
    event.response.challengeName = "CUSTOM_CHALLENGE";
    return event;
  }

  const lastRound = session[session.length - 1];
  if (lastRound?.challengeName === "CUSTOM_CHALLENGE" && lastRound.challengeResult === true) {
    event.response.issueTokens = true;
    event.response.failAuthentication = false;
    return event;
  }

  if (session.length >= MAX_ATTEMPTS) {
    event.response.issueTokens = false;
    event.response.failAuthentication = true;
    return event;
  }

  event.response.issueTokens = false;
  event.response.failAuthentication = false;
  event.response.challengeName = "CUSTOM_CHALLENGE";
  return event;
};
