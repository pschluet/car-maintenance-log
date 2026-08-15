import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getRefreshTokenMock = vi.fn();
const setSessionCookiesMock = vi.fn();
const clearSessionCookiesMock = vi.fn();
vi.mock("@/lib/session", () => ({
  getRefreshToken: getRefreshTokenMock,
  setSessionCookies: setSessionCookiesMock,
  clearSessionCookies: clearSessionCookiesMock,
}));

const refreshTokensMock = vi.fn();
vi.mock("@/lib/cognito", () => ({ refreshTokens: refreshTokensMock }));

const { GET } = await import("@/app/api/auth/refresh/route");

function get(next?: string): NextRequest {
  const q = next === undefined ? "" : `?next=${encodeURIComponent(next)}`;
  return new NextRequest(`http://0.0.0.0:3000/api/auth/refresh${q}`);
}

beforeEach(() => {
  getRefreshTokenMock.mockReset();
  setSessionCookiesMock.mockReset();
  clearSessionCookiesMock.mockReset();
  refreshTokensMock.mockReset();
});

describe("GET /api/auth/refresh", () => {
  it("redirects to a relative `next` after a successful refresh", async () => {
    getRefreshTokenMock.mockResolvedValue("rt");
    refreshTokensMock.mockResolvedValue({ idToken: "id", accessToken: "ac" });
    const res = await GET(get("/cars/5?tab=notes"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/cars/5?tab=notes");
  });

  it("redirects to /login (relative) and clears cookies when refresh fails", async () => {
    getRefreshTokenMock.mockResolvedValue(undefined);
    const res = await GET(get("/cars/5"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("/login");
    expect(clearSessionCookiesMock).toHaveBeenCalled();
  });

  it.each(["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)"])(
    "rejects the open-redirect `next` value %s and falls back to /",
    async (nextVal) => {
      getRefreshTokenMock.mockResolvedValue("rt");
      refreshTokensMock.mockResolvedValue({ idToken: "id", accessToken: "ac" });
      const res = await GET(get(nextVal));
      expect(res.headers.get("location")).toBe("/");
    }
  );

  it("never emits an absolute 0.0.0.0 Location", async () => {
    getRefreshTokenMock.mockResolvedValue("rt");
    refreshTokensMock.mockResolvedValue({ idToken: "id", accessToken: "ac" });
    const res = await GET(get("/"));
    const location = res.headers.get("location");
    expect(location).not.toContain("0.0.0.0");
    expect(location).not.toMatch(/^https?:/);
  });
});
