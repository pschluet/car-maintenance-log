import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: getCurrentUserMock }));

const presignDownloadMock = vi.fn();
vi.mock("@/lib/s3", () => ({ presignDownload: presignDownloadMock }));

const { GET } = await import("@/app/api/uploads/image/route");

const user = { sub: "1", email: "user@example.com", isAdmin: false };

beforeEach(() => {
  getCurrentUserMock.mockReset();
  presignDownloadMock.mockReset();
});

describe("GET /api/uploads/image", () => {
  it("returns 401 for a signed-out visitor", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await GET(new Request("http://x/api/uploads/image?key=cars/1/PHOTO/a.jpg"));
    expect(res.status).toBe(401);
    expect(presignDownloadMock).not.toHaveBeenCalled();
  });

  it("rejects a key outside cars/", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    const res = await GET(new Request("http://x/api/uploads/image?key=%2Fetc%2Fpasswd"));
    expect(res.status).toBe(400);
    expect(presignDownloadMock).not.toHaveBeenCalled();
  });

  it("redirects to a freshly presigned URL for a valid key, marked non-cacheable", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    presignDownloadMock.mockResolvedValue("https://s3.example.com/signed");
    const res = await GET(new Request("http://x/api/uploads/image?key=cars/1/PHOTO/a.jpg"));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://s3.example.com/signed");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(presignDownloadMock).toHaveBeenCalledWith("cars/1/PHOTO/a.jpg");
  });
});
