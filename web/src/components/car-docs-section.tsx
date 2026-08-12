"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { Attachment, CarDoc, DocKind } from "@/lib/types";
import { AttachmentThumb } from "./attachment-thumb";
import { AttachmentUploader } from "./attachment-uploader";
import { AttachmentViewer } from "./attachment-viewer";
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
  docs: CarDoc[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | undefined>();

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {docs.map((doc, i) => (
            <div key={doc.id} className="space-y-1.5">
              <AttachmentThumb attachment={doc} onClick={() => setViewingIndex(i)} />
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs text-ink-muted">{doc.fileName}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleDelete(doc.id)}
                  className="shrink-0 text-xs text-ink-muted hover:text-danger"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {viewingIndex !== undefined && (
        <AttachmentViewer
          attachments={docs}
          startIndex={viewingIndex}
          onClose={() => setViewingIndex(undefined)}
        />
      )}
    </Card>
  );
}
