import { describe, expect, it } from "vitest";
import { normalizeImportDate, normalizeImportMileage, parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("keeps commas and newlines that live inside quoted fields", () => {
    const rows = parseCsv(
      'Date,Mileage,Description\n10/25/2016,23010,"Purchased car @ Muller Honda, Highland Park"\n'
    );
    expect(rows).toEqual([
      ["Date", "Mileage", "Description"],
      ["10/25/2016", "23010", "Purchased car @ Muller Honda, Highland Park"],
    ]);
  });

  it("unescapes doubled quotes", () => {
    const rows = parseCsv('a\n"He said ""hi"""\n');
    expect(rows).toEqual([["a"], ['He said "hi"']]);
  });

  it("drops trailing blank lines", () => {
    const rows = parseCsv("a,b\n1,2\n\n");
    expect(rows).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("handles a final row with no trailing newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("normalizeImportDate", () => {
  it("converts M/D/YYYY to yyyy-mm-dd with zero padding", () => {
    expect(normalizeImportDate("6/5/2017")).toBe("2017-06-05");
    expect(normalizeImportDate("10/25/2016")).toBe("2016-10-25");
  });

  it("passes through already-ISO dates", () => {
    expect(normalizeImportDate("2026-08-11")).toBe("2026-08-11");
  });

  it("reads a 2-digit year as 20xx", () => {
    expect(normalizeImportDate("1/7/25")).toBe("2025-01-07");
  });

  it("returns null for a blank or unparseable cell", () => {
    expect(normalizeImportDate("")).toBeNull();
    expect(normalizeImportDate("sometime last spring")).toBeNull();
    expect(normalizeImportDate("13/40/2020")).toBeNull();
  });
});

describe("normalizeImportMileage", () => {
  it("strips thousands separators", () => {
    expect(normalizeImportMileage("128,887")).toBe(128887);
    expect(normalizeImportMileage("23010")).toBe(23010);
  });

  it("returns null when there are no digits", () => {
    expect(normalizeImportMileage("")).toBeNull();
    expect(normalizeImportMileage("n/a")).toBeNull();
  });
});
