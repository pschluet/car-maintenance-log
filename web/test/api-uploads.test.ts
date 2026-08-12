import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: getCurrentUserMock }));

const deleteObjectMock = vi.fn();
vi.mock("@/lib/s3", () => ({
  deleteObject: deleteObjectMock,
  presignUpload: vi.fn(),
  buildAttachmentKey: vi.fn(),
}));

const { DELETE } = await import("@/app/api/uploads/route");

const user = { sub: "1", email: "user@example.com", isAdmin: false };

beforeEach(() => {
  getCurrentUserMock.mockReset();
  deleteObjectMock.mockReset();
});

describe("DELETE /api/uploads", () => {
  it("returns 401 for a signed-out visitor", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await DELETE(
      new Request("http://x/api/uploads?key=cars/1/ENTRY/a.jpg", { method: "DELETE" })
    );
    expect(res.status).toBe(401);
    expect(deleteObjectMock).not.toHaveBeenCalled();
  });

  it("rejects a key outside cars/", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    const res = await DELETE(
      new Request("http://x/api/uploads?key=%2Fetc%2Fpasswd", { method: "DELETE" })
    );
    expect(res.status).toBe(400);
    expect(deleteObjectMock).not.toHaveBeenCalled();
  });

  it("deletes the object for a valid cars/ key", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    deleteObjectMock.mockResolvedValue(undefined);
    const res = await DELETE(
      new Request("http://x/api/uploads?key=cars/1/ENTRY/a.jpg", { method: "DELETE" })
    );
    expect(res.status).toBe(204);
    expect(deleteObjectMock).toHaveBeenCalledWith("cars/1/ENTRY/a.jpg");
  });
});
