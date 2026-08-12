"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { attachmentUrl } from "@/lib/attachment-url";
import type { Attachment, CarDoc } from "@/lib/types";
import { AttachmentUploader } from "./attachment-uploader";
import { Card } from "./ui/card";

export function CarPhotosSection({ carId, photos }: { carId: string; photos: CarDoc[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Attachment[]>([]);
  const [deleting, setDeleting] = useState<string | undefined>();
  const [activeIndex, setActiveIndex] = useState(0);

  const active = photos[Math.min(activeIndex, Math.max(photos.length - 1, 0))];

  async function handleDelete(docId: string) {
    setDeleting(docId);
    await apiFetch(`/api/cars/${carId}/docs/${docId}?kind=PHOTO`, { method: "DELETE" });
    setDeleting(undefined);
    setActiveIndex((i) => Math.min(i, Math.max(photos.length - 2, 0)));
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
        <div>
          {active && (
            <div className="relative overflow-hidden rounded-2xl bg-surface-sunken">
              {/* biome-ignore lint/performance/noImgElement: /api/uploads/image redirects
              to a presigned S3 URL, not a static/known domain next/image's remotePatterns
              could target */}
              <img
                src={attachmentUrl(active.s3Key)}
                alt={active.fileName}
                className="max-h-[65vh] w-full object-contain"
              />
              <button
                type="button"
                onClick={() => handleDelete(active.id)}
                disabled={deleting === active.id}
                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-60"
                aria-label="Delete photo"
              >
                ×
              </button>
            </div>
          )}

          {(photos.length > 1 || pending.length > 0) && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {photos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => setActiveIndex(i)}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-sunken ${
                    i === activeIndex ? "ring-2 ring-accent" : ""
                  }`}
                >
                  {/* biome-ignore lint/performance/noImgElement: see comment above */}
                  <img
                    src={attachmentUrl(photo.s3Key)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
              {pending.map((p) => (
                <div
                  key={p.s3Key}
                  className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-sunken text-center text-[10px] text-ink-muted"
                >
                  Uploading…
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
