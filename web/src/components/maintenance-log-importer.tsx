"use client";

import { useMemo, useRef, useState } from "react";
import { apiJson } from "@/lib/apiClient";
import { normalizeImportDate, normalizeImportMileage, parseCsv } from "@/lib/csv";
import { formatDateDisplay, formatMileage } from "@/lib/format";
import type { Car } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, Select } from "./ui/input";

type Mapping = { date: number; mileage: number; notes: number };

const NONE = -1;

// Guess which column is which from its header text, so the common case (a file
// whose headers are literally "Date"/"Mileage"/"Description") needs no manual
// mapping at all.
function guessColumn(headers: string[], candidates: string[]): number {
  const idx = headers.findIndex((h) => {
    const norm = h.trim().toLowerCase();
    return candidates.some((c) => norm === c || norm.includes(c));
  });
  return idx;
}

export function MaintenanceLogImporter({ cars }: { cars: Car[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [carId, setCarId] = useState(cars[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | undefined>();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Mapping>({ date: NONE, mileage: NONE, notes: NONE });
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function resetFile() {
    setFileName(undefined);
    setHeaders([]);
    setRows([]);
    setMapping({ date: NONE, mileage: NONE, notes: NONE });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(undefined);
    setResult(undefined);
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const parsed = parseCsv(text);
    if (parsed.length < 2) {
      setError("That file has no data rows below the header.");
      resetFile();
      return;
    }

    const head = parsed[0] ?? [];
    const data = parsed.slice(1);
    setFileName(file.name);
    setHeaders(head);
    setRows(data);
    setMapping({
      date: guessColumn(head, ["date"]),
      mileage: guessColumn(head, ["mileage", "miles", "odometer"]),
      notes: guessColumn(head, ["notes", "description", "note", "service", "work"]),
    });
  }

  // Turn the mapped columns into validated entry inputs, tracking which rows
  // had to be skipped (unparseable date or mileage) so the user hears about it
  // rather than silently losing entries.
  const preview = useMemo(() => {
    if (mapping.date === NONE || mapping.mileage === NONE) {
      return { entries: [], skipped: 0 };
    }
    const entries: { date: string; mileage: number; notes: string }[] = [];
    let skipped = 0;
    for (const row of rows) {
      const date = normalizeImportDate(row[mapping.date] ?? "");
      const mileage = normalizeImportMileage(row[mapping.mileage] ?? "");
      const notes = mapping.notes === NONE ? "" : (row[mapping.notes] ?? "").trim();
      if (date === null || mileage === null) {
        skipped++;
        continue;
      }
      entries.push({ date, mileage, notes });
    }
    return { entries, skipped };
  }, [rows, mapping]);

  const columnOptions = (
    <>
      <option value={NONE}>—</option>
      {headers.map((h, i) => (
        <option key={i} value={i}>
          {h.trim() || `Column ${i + 1}`}
        </option>
      ))}
    </>
  );

  async function handleImport() {
    setSubmitting(true);
    setError(undefined);
    setResult(undefined);
    try {
      const { imported } = await apiJson<{ imported: number }>(
        `/api/cars/${carId}/entries/import`,
        { method: "POST", body: JSON.stringify({ entries: preview.entries }) }
      );
      const carName = cars.find((c) => c.id === carId)?.name ?? "the car";
      setResult(
        `Added ${imported} ${imported === 1 ? "entry" : "entries"} to ${carName}` +
          (preview.skipped > 0 ? ` (${preview.skipped} row(s) skipped).` : ".")
      );
      resetFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (cars.length === 0) {
    return (
      <Card className="text-sm text-ink-muted">
        Add a car first, then you can import a maintenance log for it.
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <Field label="Car" htmlFor="import-car">
        <Select id="import-car" value={carId} onChange={(e) => setCarId(e.target.value)}>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">CSV file</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFile}
          className="block w-full text-sm text-ink-muted file:mr-3 file:min-h-11 file:rounded-xl file:border file:border-border file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-ink hover:file:bg-surface-sunken"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          A comma-separated file with a header row, one maintenance entry per line.
        </p>
      </div>

      {headers.length > 0 && (
        <>
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-medium text-ink">
              Match columns from <span className="font-normal text-ink-muted">{fileName}</span>
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Date" htmlFor="map-date">
                <Select
                  id="map-date"
                  value={mapping.date}
                  onChange={(e) => setMapping((m) => ({ ...m, date: Number(e.target.value) }))}
                >
                  {columnOptions}
                </Select>
              </Field>
              <Field label="Mileage" htmlFor="map-mileage">
                <Select
                  id="map-mileage"
                  value={mapping.mileage}
                  onChange={(e) => setMapping((m) => ({ ...m, mileage: Number(e.target.value) }))}
                >
                  {columnOptions}
                </Select>
              </Field>
              <Field label="Notes" htmlFor="map-notes">
                <Select
                  id="map-notes"
                  value={mapping.notes}
                  onChange={(e) => setMapping((m) => ({ ...m, notes: Number(e.target.value) }))}
                >
                  {columnOptions}
                </Select>
              </Field>
            </div>
          </div>

          {mapping.date === NONE || mapping.mileage === NONE ? (
            <p className="text-sm text-ink-muted">Pick the date and mileage columns to continue.</p>
          ) : (
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-sm text-ink">
                <span className="font-medium">{preview.entries.length}</span> entr
                {preview.entries.length === 1 ? "y" : "ies"} ready to import
                {preview.skipped > 0 && (
                  <span className="text-ink-muted">
                    {" "}
                    · {preview.skipped} row(s) skipped (unreadable date or mileage)
                  </span>
                )}
              </p>

              {preview.entries.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-sunken text-left text-xs text-ink-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Mileage</th>
                        <th className="px-3 py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.entries.slice(0, 5).map((entry, i) => (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="whitespace-nowrap px-3 py-2 text-ink">
                            {formatDateDisplay(entry.date)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-ink">
                            {formatMileage(entry.mileage)}
                          </td>
                          <td className="px-3 py-2 text-ink-muted">{entry.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.entries.length > 5 && (
                    <p className="border-t border-border bg-surface-sunken px-3 py-2 text-xs text-ink-muted">
                      …and {preview.entries.length - 5} more
                    </p>
                  )}
                </div>
              )}

              <Button
                type="button"
                disabled={submitting || preview.entries.length === 0}
                onClick={handleImport}
              >
                {submitting
                  ? "Importing…"
                  : `Import ${preview.entries.length} entr${preview.entries.length === 1 ? "y" : "ies"}`}
              </Button>
            </div>
          )}
        </>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      {result && <p className="text-sm text-accent">{result}</p>}
    </Card>
  );
}
