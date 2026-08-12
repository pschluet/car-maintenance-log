import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";
import type { AppUser } from "./types";

export const COOKIE = {
  id: "cml_id_token",
  access: "cml_access_token",
  refresh: "cml_refresh_token",
} as const;

// Short-lived cookies that hold Cognito's opaque CUSTOM_AUTH challenge
// session between /api/auth/start and /api/auth/verify. The session token
// is meaningless without the matching username, so both travel together.
export const CHALLENGE_COOKIE = {
  session: "cml_challenge_session",
  email: "cml_challenge_email",
} as const;

const ID_TOKEN_MAX_AGE_SECONDS = 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

const baseCookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const challengeCookieOpts = { ...baseCookieOpts, maxAge: CHALLENGE_MAX_AGE_SECONDS };

// Fixed identity used only when LOCAL_AUTH=true (docker-compose). This flag
// is never set in the CDK-deployed Lambda environment — see infra stack and
// the corresponding CDK assertion test — so this branch is dead in
// production regardless of what a client sends.
const LOCAL_ADMIN_USER: AppUser = {
  sub: "local-admin",
  email: "admin@local.test",
  isAdmin: true,
};

type Verifier = ReturnType<typeof CognitoJwtVerifier.create>;
let cachedVerifier: Verifier | null = null;

function getVerifier(): Verifier {
  if (!cachedVerifier) {
    cachedVerifier = CognitoJwtVerifier.create({
      userPoolId: process.env.USER_POOL_ID ?? "",
      tokenUse: "id",
      clientId: process.env.USER_POOL_CLIENT_ID ?? "",
    });
  }
  return cachedVerifier;
}

function claimsToUser(claims: Record<string, unknown>): AppUser {
  const groups = Array.isArray(claims["cognito:groups"])
    ? (claims["cognito:groups"] as unknown[]).map(String)
    : [];
  return {
    sub: String(claims.sub),
    email: String(claims.email ?? ""),
    isAdmin: groups.includes("Admins"),
  };
}

/** Verifies an ID token JWT and returns the app user it represents, or null
 * if missing/invalid/expired. Safe to call from Edge (middleware) or Node
 * (route handlers, server components) — aws-jwt-verify has no Node-only
 * dependencies. */
export async function verifyIdToken(idToken: string | undefined): Promise<AppUser | null> {
  if (process.env.LOCAL_AUTH === "true") return LOCAL_ADMIN_USER;
  if (!idToken) return null;
  try {
    const claims = await getVerifier().verify(idToken);
    return claimsToUser(claims as unknown as Record<string, unknown>);
  } catch {
    return null;
  }
}

/** Node-only: reads the session cookie for use in route handlers and server
 * components. */
export async function getCurrentUser(): Promise<AppUser | null> {
  if (process.env.LOCAL_AUTH === "true") return LOCAL_ADMIN_USER;
  const idToken = (await cookies()).get(COOKIE.id)?.value;
  return verifyIdToken(idToken);
}

export interface SessionTokens {
  idToken: string;
  accessToken: string;
  refreshToken?: string;
}

/** Node-only: sets session cookies from a route handler. `refreshToken` is
 * omitted on a refresh response when Cognito didn't rotate it — the
 * existing refresh cookie stays in place. */
export async function setSessionCookies(tokens: SessionTokens): Promise<void> {
  const store = await cookies();
  store.set(COOKIE.id, tokens.idToken, { ...baseCookieOpts, maxAge: ID_TOKEN_MAX_AGE_SECONDS });
  store.set(COOKIE.access, tokens.accessToken, {
    ...baseCookieOpts,
    maxAge: ID_TOKEN_MAX_AGE_SECONDS,
  });
  if (tokens.refreshToken) {
    store.set(COOKIE.refresh, tokens.refreshToken, {
      ...baseCookieOpts,
      maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
    });
  }
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE.id);
  store.delete(COOKIE.access);
  store.delete(COOKIE.refresh);
}

export async function getRefreshToken(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE.refresh)?.value;
}

export async function setChallengeCookies(session: string, email: string): Promise<void> {
  const store = await cookies();
  store.set(CHALLENGE_COOKIE.session, session, challengeCookieOpts);
  store.set(CHALLENGE_COOKIE.email, email, challengeCookieOpts);
}

export async function getChallengeCookies(): Promise<{ session?: string; email?: string }> {
  const store = await cookies();
  return {
    session: store.get(CHALLENGE_COOKIE.session)?.value,
    email: store.get(CHALLENGE_COOKIE.email)?.value,
  };
}

export async function clearChallengeCookies(): Promise<void> {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE.session);
  store.delete(CHALLENGE_COOKIE.email);
}
