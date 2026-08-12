import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: getCurrentUserMock }));

const listUsersMock = vi.fn();
const createUserMock = vi.fn();
const deleteUserMock = vi.fn();
vi.mock("@/lib/cognito", () => ({
  listUsers: listUsersMock,
  createUser: createUserMock,
  deleteUser: deleteUserMock,
}));

const { GET, POST } = await import("@/app/api/admin/users/route");
const { DELETE } = await import("@/app/api/admin/users/[email]/route");

const admin = { sub: "1", email: "admin@example.com", isAdmin: true };
const nonAdmin = { sub: "2", email: "user@example.com", isAdmin: false };

beforeEach(() => {
  getCurrentUserMock.mockReset();
  listUsersMock.mockReset();
  createUserMock.mockReset();
  deleteUserMock.mockReset();
});

describe("GET/POST /api/admin/users", () => {
  it("returns 403 for a non-admin", async () => {
    getCurrentUserMock.mockResolvedValue(nonAdmin);
    expect((await GET()).status).toBe(403);
  });

  it("returns 403 for a signed-out visitor", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await GET()).status).toBe(403);
  });

  it("lets an admin list users", async () => {
    getCurrentUserMock.mockResolvedValue(admin);
    listUsersMock.mockResolvedValue([]);
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("blocks a non-admin from creating a user", async () => {
    getCurrentUserMock.mockResolvedValue(nonAdmin);
    const res = await POST(
      new Request("http://x", { method: "POST", body: JSON.stringify({ email: "n@e.com" }) })
    );
    expect(res.status).toBe(403);
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it("lets an admin create a user", async () => {
    getCurrentUserMock.mockResolvedValue(admin);
    createUserMock.mockResolvedValue(undefined);
    const res = await POST(
      new Request("http://x", {
        method: "POST",
        body: JSON.stringify({ email: "new@example.com", isAdmin: false }),
      })
    );
    expect(res.status).toBe(201);
    expect(createUserMock).toHaveBeenCalledWith("new@example.com", false);
  });
});

describe("DELETE /api/admin/users/[email]", () => {
  it("returns 403 for a non-admin", async () => {
    getCurrentUserMock.mockResolvedValue(nonAdmin);
    const res = await DELETE(new Request("http://x", { method: "DELETE" }), {
      params: Promise.resolve({ email: "target@example.com" }),
    });
    expect(res.status).toBe(403);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("blocks an admin from deleting their own account", async () => {
    getCurrentUserMock.mockResolvedValue(admin);
    const res = await DELETE(new Request("http://x", { method: "DELETE" }), {
      params: Promise.resolve({ email: admin.email }),
    });
    expect(res.status).toBe(400);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("lets an admin delete a different user", async () => {
    getCurrentUserMock.mockResolvedValue(admin);
    const res = await DELETE(new Request("http://x", { method: "DELETE" }), {
      params: Promise.resolve({ email: "someone-else@example.com" }),
    });
    expect(res.status).toBe(204);
    expect(deleteUserMock).toHaveBeenCalledWith("someone-else@example.com");
  });
});
