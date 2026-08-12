// Small, dependency-free CSV helpers for the maintenance-log importer.
// A real CSV parser is overkill here (and pulling in a library for one admin
// screen isn't worth it), but the exports do have to survive quoted fields
// containing commas, embedded newlines, and doubled "" escapes — the attached
// Odyssey log has notes like `"Oil & filter change, ..."` that would otherwise
// split into the wrong columns.

/** Parse CSV text into rows of string fields. Handles quoted fields with
 * embedded commas/newlines and "" escapes. Trailing blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // Flush the final field/row (a file that doesn't end in a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // Drop rows that are entirely empty (e.g. a trailing blank line).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Coerce a spreadsheet date cell into the app's `yyyy-mm-dd` format.
 * Accepts `M/D/YYYY`, `M-D-YYYY`, and already-ISO `yyyy-mm-dd` (2-digit years
 * are read as 20xx). Returns null when the cell isn't a recognizable date so
 * callers can skip and report the row rather than write garbage. */
export function normalizeImportDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  let y: number;
  let mo: number;
  let d: number;

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const slash = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (iso) {
    y = Number(iso[1]);
    mo = Number(iso[2]);
    d = Number(iso[3]);
  } else if (slash) {
    const yearStr = slash[3] as string;
    mo = Number(slash[1]);
    d = Number(slash[2]);
    y = yearStr.length === 2 ? Number(yearStr) + 2000 : Number(yearStr);
  } else {
    return null;
  }

  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900 || y > 9999) return null;
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

/** Pull the digits out of a mileage cell (`"128,887"` -> 128887). Returns null
 * for a blank cell or one with no digits at all. */
export function normalizeImportMileage(input: string): number | null {
  const digits = input.replace(/[^0-9]/g, "");
  if (digits === "") return null;
  return Number(digits);
}
