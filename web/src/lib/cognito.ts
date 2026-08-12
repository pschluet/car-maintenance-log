import {
  AdminAddUserToGroupCommand,
  AdminCreateUserCommand,
  AdminDeleteUserCommand,
  AdminListGroupsForUserCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ListUsersCommand,
  NotAuthorizedException,
  RespondToAuthChallengeCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const USER_POOL_ID = process.env.USER_POOL_ID ?? "";
const CLIENT_ID = process.env.USER_POOL_CLIENT_ID ?? "";

const client = new CognitoIdentityProviderClient({});

export interface AuthChallenge {
  session: string;
}

export interface AuthResult {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

/** Starts CUSTOM_AUTH. The pool's create/define auth-challenge Lambdas email
 * a 6-digit code and return a challenge session rather than tokens. */
export async function startAuth(email: string): Promise<AuthChallenge> {
  const res = await client.send(
    new InitiateAuthCommand({
      AuthFlow: "CUSTOM_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: { USERNAME: email },
    })
  );
  if (!res.Session) throw new Error("Cognito did not return a challenge session");
  return { session: res.Session };
}

export async function verifyAuth(
  email: string,
  session: string,
  code: string
): Promise<AuthResult | AuthChallenge> {
  const res = await client.send(
    new RespondToAuthChallengeCommand({
      ChallengeName: "CUSTOM_CHALLENGE",
      ClientId: CLIENT_ID,
      Session: session,
      ChallengeResponses: { USERNAME: email, ANSWER: code },
    })
  );
  if (res.AuthenticationResult) {
    const { IdToken, AccessToken, RefreshToken } = res.AuthenticationResult;
    if (!IdToken || !AccessToken || !RefreshToken) {
      throw new Error("Cognito returned an incomplete authentication result");
    }
    return { idToken: IdToken, accessToken: AccessToken, refreshToken: RefreshToken };
  }
  if (!res.Session) throw new Error("Cognito did not return tokens or a new challenge session");
  return { session: res.Session };
}

export interface RefreshResult {
  idToken: string;
  accessToken: string;
}

/** Returns null (rather than throwing) when the refresh token itself is
 * expired or revoked — that's the expected, common case of a stale session
 * and callers treat it as "sign in again," not a server error. */
export async function refreshTokens(refreshToken: string): Promise<RefreshResult | null> {
  try {
    const res = await client.send(
      new InitiateAuthCommand({
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: CLIENT_ID,
        AuthParameters: { REFRESH_TOKEN: refreshToken },
      })
    );
    const { IdToken, AccessToken } = res.AuthenticationResult ?? {};
    if (!IdToken || !AccessToken) return null;
    return { idToken: IdToken, accessToken: AccessToken };
  } catch (err) {
    if (err instanceof NotAuthorizedException) return null;
    throw err;
  }
}

export interface CognitoUserSummary {
  sub: string;
  email: string;
  enabled: boolean;
  status: string;
  isAdmin: boolean;
}

export async function listUsers(): Promise<CognitoUserSummary[]> {
  const res = await client.send(new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60 }));
  const users = res.Users ?? [];
  return Promise.all(
    users.map(async (u) => {
      const attrs = new Map((u.Attributes ?? []).map((a) => [a.Name, a.Value]));
      const groups = await client.send(
        new AdminListGroupsForUserCommand({ UserPoolId: USER_POOL_ID, Username: u.Username })
      );
      return {
        sub: attrs.get("sub") ?? u.Username ?? "",
        email: attrs.get("email") ?? "",
        enabled: u.Enabled ?? false,
        status: u.UserStatus ?? "UNKNOWN",
        isAdmin: (groups.Groups ?? []).some((g) => g.GroupName === "Admins"),
      };
    })
  );
}

export async function createUser(email: string, isAdmin: boolean): Promise<void> {
  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
      // No password is ever set — sign-in is always the email-OTP CUSTOM_AUTH
      // flow, so there's nothing for a welcome-with-password email to convey.
      MessageAction: "SUPPRESS",
      DesiredDeliveryMediums: [],
    })
  );
  if (isAdmin) {
    await client.send(
      new AdminAddUserToGroupCommand({
        UserPoolId: USER_POOL_ID,
        Username: email,
        GroupName: "Admins",
      })
    );
  }
}

export async function deleteUser(email: string): Promise<void> {
  await client.send(new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: email }));
}
