import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/session", () => ({ getCurrentUser: getCurrentUserMock }));

const getCarMock = vi.fn();
vi.mock("@/lib/repo/cars", () => ({ getCar: getCarMock }));

const createEntriesMock = vi.fn();
vi.mock("@/lib/repo/entries", () => ({ createEntries: createEntriesMock }));

const { POST } = await import("@/app/api/cars/[carId]/entries/import/route");

const user = { sub: "1", email: "admin@example.com", isAdmin: true };
const params = Promise.resolve({ carId: "car-1" });

function post(body: unknown) {
  return POST(
    new Request("http://x/api/cars/car-1/entries/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    { params }
  );
}

beforeEach(() => {
  getCurrentUserMock.mockReset();
  getCarMock.mockReset();
  createEntriesMock.mockReset();
});

describe("POST /api/cars/[carId]/entries/import", () => {
  it("returns 401 for a signed-out visitor", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await post({ entries: [{ date: "2020-01-01", mileage: 1000 }] });
    expect(res.status).toBe(401);
    expect(createEntriesMock).not.toHaveBeenCalled();
  });

  it("returns 400 when an entry fails validation", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    const res = await post({ entries: [{ date: "01/01/2020", mileage: 1000 }] });
    expect(res.status).toBe(400);
    expect(createEntriesMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an empty batch", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    const res = await post({ entries: [] });
    expect(res.status).toBe(400);
  });

  it("returns 404 when the car doesn't exist", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    getCarMock.mockResolvedValue(undefined);
    const res = await post({ entries: [{ date: "2020-01-01", mileage: 1000 }] });
    expect(res.status).toBe(404);
    expect(createEntriesMock).not.toHaveBeenCalled();
  });

  it("imports valid entries and reports the count", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    getCarMock.mockResolvedValue({ id: "car-1", name: "Odyssey" });
    createEntriesMock.mockResolvedValue([{}, {}]);
    const res = await post({
      entries: [
        { date: "2016-10-25", mileage: 23010, notes: "Purchased" },
        { date: "2017-06-05", mileage: 29996, notes: "Oil change" },
      ],
    });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ imported: 2 });
    expect(createEntriesMock).toHaveBeenCalledWith(
      "car-1",
      expect.arrayContaining([expect.objectContaining({ date: "2016-10-25", mileage: 23010 })]),
      "admin@example.com"
    );
  });
});
