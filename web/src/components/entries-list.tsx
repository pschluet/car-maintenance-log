"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { formatDateDisplay, formatMileage, mechanicDisplayName, quickJobLabel } from "@/lib/format";
import type { MaintenanceEntry, Mechanic } from "@/lib/types";
import { Card } from "./ui/card";

export function EntriesList({
  carId,
  entries,
  mechanics,
}: {
  carId: string;
  entries: MaintenanceEntry[];
  mechanics: Mechanic[];
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | undefined>();

  async function handleDelete(entryId: string) {
    setDeleting(entryId);
    await apiFetch(`/api/cars/${carId}/entries/${entryId}`, { method: "DELETE" });
    setDeleting(undefined);
    router.refresh();
  }

  if (entries.length === 0) {
    return (
      <Card className="text-center text-sm text-ink-muted">
        No maintenance logged yet. Add the first entry below.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <Card key={entry.id}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">{formatDateDisplay(entry.date)}</p>
              <p className="text-sm text-ink-muted">
                {formatMileage(entry.mileage)} · {mechanicDisplayName(entry.mechanicId, mechanics)}
              </p>
            </div>
            <div className="flex gap-3 text-sm">
              <Link
                href={`/cars/${carId}/entries/${entry.id}`}
                className="text-accent hover:underline"
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={deleting === entry.id}
                onClick={() => handleDelete(entry.id)}
                className="text-ink-muted hover:text-danger"
              >
                Delete
              </button>
            </div>
          </div>

          {entry.quickJobs.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {entry.quickJobs.map((job) => (
                <span
                  key={job}
                  className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-strong"
                >
                  {quickJobLabel(job)}
                </span>
              ))}
            </div>
          )}

          {entry.notes && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{entry.notes}</p>
          )}

          {entry.attachments.length > 0 && (
            <p className="mt-2 text-xs text-ink-muted">
              {entry.attachments.length} attachment{entry.attachments.length === 1 ? "" : "s"}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
