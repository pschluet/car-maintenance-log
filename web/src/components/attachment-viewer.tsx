"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { attachmentUrl } from "@/lib/attachment-url";
import type { AttachmentLike } from "@/lib/types";
import { ChevronIcon, DocumentIcon } from "./ui/icons";

/** Full-screen modal previewer for one or more attachments, shared by the
 * maintenance log, the car docs sections, and the entry form. PDFs get a
 * glyph + "Open in new tab" instead of an inline embed — embedding PDFs in
 * a modal is unreliable on iOS Safari. */
export function AttachmentViewer({
  attachments,
  startIndex = 0,
  onClose,
}: {
  attachments: AttachmentLike[];
  startIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(i + 1, attachments.length - 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(i - 1, 0));
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, attachments.length]);

  const current = attachments[Math.min(index, attachments.length - 1)];
  if (!current) return null;
  const isImage = current.contentType.startsWith("image/");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-full max-w-full flex-col items-center gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImage ? (
          // biome-ignore lint/performance/noImgElement: /api/uploads/image redirects to a presigned S3 URL, not a static/known domain next/image's remotePatterns could target
          <img
            src={attachmentUrl(current.s3Key)}
            alt={current.fileName}
            className="max-h-[80vh] max-w-full rounded-lg object-contain"
          />
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-raised p-8 text-center">
            <DocumentIcon className="h-12 w-12 text-ink-muted" />
            <p className="max-w-xs truncate text-sm text-ink">{current.fileName}</p>
            <a
              href={attachmentUrl(current.s3Key)}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-accent underline-offset-2 hover:underline"
            >
              Open in new tab
            </a>
          </div>
        )}

        {attachments.length > 1 && (
          <div className="flex items-center gap-4 text-sm text-white">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
              aria-label="Previous attachment"
            >
              <ChevronIcon className="h-5 w-5 rotate-180" />
            </button>
            <span>
              {index + 1} / {attachments.length}
            </span>
            <button
              type="button"
              disabled={index === attachments.length - 1}
              onClick={() => setIndex((i) => Math.min(i + 1, attachments.length - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
              aria-label="Next attachment"
            >
              <ChevronIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg text-white hover:bg-white/20"
      >
        ×
      </button>
    </div>,
    document.body
  );
}
