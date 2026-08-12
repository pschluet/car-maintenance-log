import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyIdToken } from "@/lib/session";

describe("verifyIdToken", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the fixed local admin when LOCAL_AUTH=true, regardless of the token", () => {
    vi.stubEnv("LOCAL_AUTH", "true");
    return verifyIdToken(undefined).then((user) => {
      expect(user).toEqual({ sub: "local-admin", email: "admin@local.test", isAdmin: true });
    });
  });

  it("never engages the shim when LOCAL_AUTH is unset — a missing token yields null", async () => {
    vi.stubEnv("LOCAL_AUTH", "");
    const user = await verifyIdToken(undefined);
    expect(user).toBeNull();
  });

  it("rejects a malformed token rather than throwing", async () => {
    vi.stubEnv("LOCAL_AUTH", "");
    const user = await verifyIdToken("not-a-real-jwt");
    expect(user).toBeNull();
  });
});
