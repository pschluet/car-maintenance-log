import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

const TAB = String.fromCharCode(9);
const CR = String.fromCharCode(13);

describe("safeNext", () => {
  it("passes through an ordinary local path", () => {
    expect(safeNext("/cars/5?tab=notes")).toBe("/cars/5?tab=notes");
  });

  it.each([null, undefined, ""])("falls back to / for %s", (raw) => {
    expect(safeNext(raw)).toBe("/");
  });

  it.each([
    "//evil.com",
    "https://evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    `/${TAB}/evil.com`,
    `/${TAB}${TAB}/evil.com`,
    `/${CR}/evil.com`,
  ])("rejects the open-redirect value %s", (raw) => {
    expect(safeNext(raw)).toBe("/");
  });

  it("keeps a percent-encoded slash literal rather than treating it as a path separator", () => {
    // %2f is never decoded during URL resolution, so this stays a same-origin
    // path — it is not an open-redirect vector even though it looks similar.
    expect(safeNext("%2f%2fevil.com")).toBe("/%2f%2fevil.com");
  });
});
