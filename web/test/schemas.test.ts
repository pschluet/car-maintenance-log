import { describe, expect, it } from "vitest";
import {
  carInputSchema,
  entryInputSchema,
  mechanicInputSchema,
  presignRequestSchema,
  verifyAuthSchema,
} from "@/lib/schemas";
import { DIY_MECHANIC_ID } from "@/lib/types";

describe("carInputSchema", () => {
  it("requires a name", () => {
    expect(carInputSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects a year far in the future", () => {
    const result = carInputSchema.safeParse({ name: "Truck", year: 3000 });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid car", () => {
    const result = carInputSchema.safeParse({ name: "Sarah's CR-V" });
    expect(result.success).toBe(true);
  });
});

describe("entryInputSchema", () => {
  it("requires a yyyy-mm-dd date", () => {
    expect(entryInputSchema.safeParse({ date: "08/11/2026", mileage: 1000 }).success).toBe(false);
    expect(entryInputSchema.safeParse({ date: "2026-08-11", mileage: 1000 }).success).toBe(true);
  });

  it("defaults mechanicId to DIY and quickJobs to an empty list", () => {
    const result = entryInputSchema.parse({ date: "2026-08-11", mileage: 42000 });
    expect(result.mechanicId).toBe(DIY_MECHANIC_ID);
    expect(result.quickJobs).toEqual([]);
    expect(result.attachments).toEqual([]);
  });

  it("rejects negative mileage", () => {
    expect(entryInputSchema.safeParse({ date: "2026-08-11", mileage: -1 }).success).toBe(false);
  });

  it("rejects a quick job id that isn't one of the known constants", () => {
    const result = entryInputSchema.safeParse({
      date: "2026-08-11",
      mileage: 1000,
      quickJobs: ["not-a-real-job"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts multiple quick jobs selected at once", () => {
    const result = entryInputSchema.parse({
      date: "2026-08-11",
      mileage: 1000,
      quickJobs: ["oil-change", "tire-rotation"],
    });
    expect(result.quickJobs).toEqual(["oil-change", "tire-rotation"]);
  });
});

describe("mechanicInputSchema", () => {
  it("requires a name but not address/phone", () => {
    expect(mechanicInputSchema.safeParse({ name: "Joe's Garage" }).success).toBe(true);
    expect(mechanicInputSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("presignRequestSchema", () => {
  it("accepts ENTRY and each doc kind", () => {
    for (const kind of ["ENTRY", "PHOTO", "INSURANCE", "REGISTRATION"]) {
      expect(
        presignRequestSchema.safeParse({
          fileName: "a.jpg",
          contentType: "image/jpeg",
          carId: "car-1",
          kind,
        }).success
      ).toBe(true);
    }
  });

  it("rejects an unknown kind", () => {
    expect(
      presignRequestSchema.safeParse({
        fileName: "a.jpg",
        contentType: "image/jpeg",
        carId: "car-1",
        kind: "RECEIPT",
      }).success
    ).toBe(false);
  });
});

describe("verifyAuthSchema", () => {
  it("requires exactly 6 digits", () => {
    expect(verifyAuthSchema.safeParse({ code: "12345" }).success).toBe(false);
    expect(verifyAuthSchema.safeParse({ code: "1234567" }).success).toBe(false);
    expect(verifyAuthSchema.safeParse({ code: "abcdef" }).success).toBe(false);
    expect(verifyAuthSchema.safeParse({ code: "123456" }).success).toBe(true);
  });
});
