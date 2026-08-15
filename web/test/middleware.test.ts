import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
});

describe("middleware redirects", () => {
  // Behind CloudFront + the Lambda Function URL the public Host header is
  // stripped, so req.url resolves to the server's own 0.0.0.0:3000 authority.
  // Redirects must therefore be relative paths, never absolute URLs, or the
  // browser is sent to 0.0.0.0 ("restricted network port" in Safari).
  const assertRelative = (location: string | null) => {
    expect(location).toBeTruthy();
    expect(location).toMatch(/^\//);
    expect(location).not.toContain("0.0.0.0");
    expect(location).not.toMatch(/^https?:/);
  };

  it("redirects an expired session with a refresh cookie to a relative refresh path", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    const res = await middleware(request("/cars/5", "cml_refresh_token=rt"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    assertRelative(location);
    expect(location).toContain("/api/auth/refresh?next=");
    expect(location).toContain(encodeURIComponent("/cars/5"));
  });

  it("redirects a signed-out visitor (no refresh cookie) to a relative login path", async () => {
    verifyIdTokenMock.mockResolvedValue(null);
    const res = await middleware(request("/cars/5"));
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    assertRelative(location);
    expect(location).toContain("/login?next=");
  });

  it("redirects a non-admin away from /admin with a relative path", async () => {
    verifyIdTokenMock.mockResolvedValue(nonAdmin);
    const res = await middleware(request("/admin", "cml_id_token=id"));
    expect(res.status).toBe(307);
    assertRelative(res.headers.get("location"));
    expect(res.headers.get("location")).toBe("/");
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
