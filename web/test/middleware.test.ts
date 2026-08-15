import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const verifyIdTokenMock = vi.fn();
vi.mock("@/lib/session", () => ({
  COOKIE: { id: "cml_id_token", access: "cml_access_token", refresh: "cml_refresh_token" },
  verifyIdToken: verifyIdTokenMock,
}));

const { middleware } = await import("@/middleware");

const admin = { sub: "1", email: "a@example.com", isAdmin: true };
const nonAdmin = { sub: "2", email: "u@example.com", isAdmin: false };

function request(path: string, cookie = ""): NextRequest {
  return new NextRequest(`http://0.0.0.0:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

beforeEach(() => {
  verifyIdTokenMock.mockReset();
  vi.stubEnv("SITE_URL", "https://cars.pauldev.io");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("middleware redirects", () => {
  // Behind CloudFront + the Lambda Function URL, req.nextUrl.origin resolves
  // to the standalone server's own 0.0.0.0:3000 bind authority, not the
  // public Host — see siteOrigin()'s doc comment. Redirects must therefore
  // be absolute URLs built from SITE_URL, never bare paths: Next's
  // middleware adapter feeds every Location through `new NextURL(loc)` with
  // no base, so a relative Location throws "Invalid URL" and 500s the
  // request. `new URL(location)` below performs that identical check.
  const assertAbsolutePublicUrl = (location: string | null) => {
    expect(location).toBeTruthy();
    expect(() => new URL(location as string)).not.toThrow();
    expect(new URL(location as string).host).toBe("cars.pauldev.io");
  };

  it("redirects an expired session with a refresh cookie to the public refresh URL", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    const res = await middleware(request("/cars/5", "cml_refresh_token=rt"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    assertAbsolutePublicUrl(location);
    expect(location).toContain("/api/auth/refresh?next=");
    expect(location).toContain(encodeURIComponent("/cars/5"));
  });

  it("redirects a signed-out visitor (no refresh cookie) to the public login URL", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    const res = await middleware(request("/cars/5"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    assertAbsolutePublicUrl(location);
    expect(location).toContain("/login?next=");
  });

  it("redirects a non-admin away from /admin to the public origin", async () => {
    verifyIdTokenMock.mockResolvedValue(nonAdmin);
    const res = await middleware(request("/admin", "cml_id_token=id"));
    expect(res.status).toBe(307);
    assertAbsolutePublicUrl(res.headers.get("location"));
    expect(res.headers.get("location")).toBe("https://cars.pauldev.io/");
  });

  it("returns 401 JSON (not a redirect) for an unauthenticated API call", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    const res = await middleware(request("/api/cars", "cml_refresh_token=rt"));
    expect(res.status).toBe(401);
    expect(res.headers.get("location")).toBeNull();
  });

  it("lets a valid session through untouched", async () => {
    verifyIdTokenMock.mockResolvedValue(admin);
    const res = await middleware(request("/cars/5", "cml_id_token=id"));
    expect(res.headers.get("location")).toBeNull();
  });
});
