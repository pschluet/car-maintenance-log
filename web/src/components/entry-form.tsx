"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AttachmentThumb } from "@/components/attachment-thumb";
import { AttachmentUploader } from "@/components/attachment-uploader";
import { AttachmentViewer } from "@/components/attachment-viewer";
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
  // s3Keys uploaded during *this* form session (as opposed to loaded from a
  // saved entry). Removing one of these can delete its S3 object right
  // away; a pre-existing attachment is only dropped from local state here —
  // deleting it immediately would orphan the saved entry if the user then
  // navigates away without saving. `updateEntry` (repo/entries.ts) already
  // diffs and deletes removed attachments at save time, which is the
  // correct moment for those.
  const [sessionKeys, setSessionKeys] = useState<Set<string>>(new Set());
  const [viewingIndex, setViewingIndex] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function toggleJob(id: QuickJobId) {
    setQuickJobs((prev) => (prev.includes(id) ? prev.filter((j) => j !== id) : [...prev, id]));
  }

  function handleUploaded(attachment: Attachment) {
    setAttachments((prev) => [...prev, attachment]);
    setSessionKeys((prev) => new Set(prev).add(attachment.s3Key));
  }

  async function handleRemoveAttachment(s3Key: string) {
    setAttachments((prev) => prev.filter((a) => a.s3Key !== s3Key));
    if (sessionKeys.has(s3Key)) {
      setSessionKeys((prev) => {
        const next = new Set(prev);
        next.delete(s3Key);
        return next;
      });
      await apiFetch(`/api/uploads?key=${encodeURIComponent(s3Key)}`, { method: "DELETE" });
    }
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

  async function handleCancel() {
    setSubmitting(true);
    // Clean up anything uploaded this session but never saved to the entry.
    await Promise.all(
      Array.from(sessionKeys).map((key) =>
        apiFetch(`/api/uploads?key=${encodeURIComponent(key)}`, { method: "DELETE" })
      )
    );
    router.push(`/cars/${carId}`);
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date" htmlFor="date">
          <Input
            id="date"
            type="date"
            required
            className="min-w-0"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <Field label="Mileage" htmlFor="mileage">
          <Input
            id="mileage"
            inputMode="numeric"
            required
            className="min-w-0"
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
        {attachments.length > 0 && (
          <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {attachments.map((a, i) => (
              <div key={a.s3Key} className="space-y-1">
                <AttachmentThumb attachment={a} onClick={() => setViewingIndex(i)} />
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(a.s3Key)}
                  className="w-full text-center text-xs text-ink-muted hover:text-danger"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <AttachmentUploader
          carId={carId}
          kind="ENTRY"
          multiple
          label="+ Add receipt or photo"
          onUploaded={handleUploaded}
        />
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting} className="flex-1">
          {submitting ? "Saving…" : entry ? "Save changes" : "Add entry"}
        </Button>
        <Button type="button" variant="ghost" disabled={submitting} onClick={handleCancel}>
          Cancel
        </Button>
      </div>

      {entry && (
        <div className="border-t border-border pt-4">
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            onClick={handleDelete}
            disabled={submitting}
          >
            Delete
          </Button>
        </div>
      )}

      {viewingIndex !== undefined && (
        <AttachmentViewer
          attachments={attachments}
          startIndex={viewingIndex}
          onClose={() => setViewingIndex(undefined)}
        />
      )}
    </form>
  );
}
