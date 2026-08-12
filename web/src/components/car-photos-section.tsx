"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Attachment, CarDoc } from "@/lib/types";
import { AttachmentUploader } from "./attachment-uploader";
import { Card } from "./ui/card";

export function CarPhotosSection({
  carId,
  photos,
}: {
  carId: string;
  photos: (CarDoc & { viewUrl: string })[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Attachment[]>([]);
  const [deleting, setDeleting] = useState<string | undefined>();

  async function handleDelete(docId: string) {
    setDeleting(docId);
    await apiFetch(`/api/cars/${carId}/docs/${docId}?kind=PHOTO`, { method: "DELETE" });
    setDeleting(undefined);
    router.refresh();
  }

  async function handleUploaded(attachment: Attachment) {
    setPending((prev) => [...prev, attachment]);
    await apiFetch(`/api/cars/${carId}/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "PHOTO", ...attachment }),
    });
    setPending((prev) => prev.filter((a) => a.s3Key !== attachment.s3Key));
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-ink">Photos</h2>
        <AttachmentUploader
          carId={carId}
          kind="PHOTO"
          multiple
          label="+ Add photo"
          onUploaded={handleUploaded}
        />
      </div>
      {photos.length === 0 && pending.length === 0 ? (
        <p className="text-sm text-ink-muted">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-xl bg-surface-sunken"
            >
              {/* biome-ignore lint/performance/noImgElement: presigned S3 URL, not a static/known
              domain next/image's remotePatterns could target */}
              <img
                src={photo.viewUrl}
                alt={photo.fileName}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleDelete(photo.id)}
                disabled={deleting === photo.id}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:opacity-100"
                aria-label="Delete photo"
              >
                ×
              </button>
            </div>
          ))}
          {pending.map((p) => (
            <div
              key={p.s3Key}
              className="flex aspect-square items-center justify-center rounded-xl bg-surface-sunken text-xs text-ink-muted"
            >
              Uploading…
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
