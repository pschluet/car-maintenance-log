"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { apiFetch, apiJson } from "@/lib/apiClient";
import { todayLocalDate } from "@/lib/format";
import {
  DIY_MECHANIC_ID,
  QUICK_JOBS,
  type Attachment,
  type MaintenanceEntry,
  type Mechanic,
  type QuickJobId,
} from "@/lib/types";
import { Button } from "./ui/button";
import { ToggleChip } from "./ui/chip";
import { Field, Input, Select, Textarea } from "./ui/input";

export function EntryForm({
  carId,
  mechanics,
  entry,
}: {
  carId: string;
  mechanics: Mechanic[];
  entry?: MaintenanceEntry;
}) {
  const router = useRouter();
  const [date, setDate] = useState(entry?.date ?? todayLocalDate());
  const [mileage, setMileage] = useState(entry?.mileage?.toString() ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [quickJobs, setQuickJobs] = useState<QuickJobId[]>(entry?.quickJobs ?? []);
  const [mechanicId, setMechanicId] = useState(entry?.mechanicId ?? DIY_MECHANIC_ID);
  const [attachments, setAttachments] = useState<Attachment[]>(entry?.attachments ?? []);
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function toggleJob(id: QuickJobId) {
    setQuickJobs((prev) => (prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const input = {
        date,
        mileage: Number(mileage),
        notes,
        quickJobs,
        mechanicId,
        attachments,
      };
      if (entry) {
        await apiJson(`/api/cars/${carId}/entries/${entry.id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
      } else {
        await apiJson(`/api/cars/${carId}/entries`, {
          method: "POST",
          body: JSON.stringify(input),
        });
      }
      router.push(`/cars/${carId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!entry) return;
    setSubmitting(true);
    await apiFetch(`/api/cars/${carId}/entries/${entry.id}`, { method: "DELETE" });
    router.push(`/cars/${carId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date" htmlFor="date">
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Mileage" htmlFor="mileage">
          <Input
            id="mileage"
            inputMode="numeric"
            required
            value={mileage}
            onChange={(e) => setMileage(e.target.value.replace(/\D/g, ""))}
            placeholder="82000"
          />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Common jobs</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_JOBS.map((job) => (
            <ToggleChip
              key={job.id}
              label={job.label}
              selected={quickJobs.includes(job.id)}
              onClick={() => toggleJob(job.id)}
            />
          ))}
        </div>
      </div>

      <Field label="Notes" htmlFor="notes">
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything else worth remembering about this visit…"
        />
      </Field>

      <Field label="Performed by" htmlFor="mechanic">
        <Select id="mechanic" value={mechanicId} onChange={(e) => setMechanicId(e.target.value)}>
          <option value={DIY_MECHANIC_ID}>Myself (DIY)</option>
          {mechanics.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <p className="mb-1.5 text-sm font-medium text-ink">Attachments</p>
        <div className="mb-2 space-y-1.5">
          {attachments.map((a) => (
            <div
              key={a.s3Key}
              className="flex items-center justify-between gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm"
            >
              <span className="truncate text-ink">{a.fileName}</span>
              <button
                type="button"
                onClick={() => setAttachments((prev) => prev.filter((x) => x.s3Key !== a.s3Key))}
                className="text-ink-muted hover:text-danger"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <AttachmentUploader
          carId={carId}
          kind="ENTRY"
          multiple
          label="+ Add receipt or photo"
          onUploaded={(a) => setAttachments((prev) => [...prev, a])}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </Button>
        {entry && (
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
}
