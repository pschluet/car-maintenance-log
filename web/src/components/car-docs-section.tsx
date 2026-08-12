"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Attachment, CarDoc, DocKind } from "@/lib/types";
import { AttachmentUploader } from "./attachment-uploader";
import { Card } from "./ui/card";

export function CarDocsSection({
  carId,
  kind,
  title,
  docs,
}: {
  carId: string;
  kind: DocKind;
  title: string;
  docs: (CarDoc & { viewUrl: string })[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete(docId: string) {
    setBusy(true);
    await apiFetch(`/api/cars/${carId}/docs/${docId}?kind=${kind}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  async function handleUploaded(attachment: Attachment) {
    await apiFetch(`/api/cars/${carId}/docs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...attachment }),
    });
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-ink">{title}</h2>
        <AttachmentUploader
          carId={carId}
          kind={kind}
          multiple
          label="+ Add"
          onUploaded={handleUploaded}
        />
      </div>
      {docs.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing on file yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken px-3 py-2"
            >
              <a
                href={doc.viewUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm text-accent underline-offset-2 hover:underline"
              >
                {doc.fileName}
              </a>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDelete(doc.id)}
                className="text-sm text-ink-muted hover:text-danger"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
