"use client";

import { attachmentUrl } from "@/lib/attachment-url";
import type { AttachmentLike } from "@/lib/types";
import { DocumentIcon } from "./ui/icons";

/** Shared tile for a single attachment: an image preview, or a document
 * glyph + filename for anything else (PDFs). Used by the docs sections and
 * the entry form. Clicking opens the AttachmentViewer rather than linking
 * out, so both places get the same preview experience. */
export function AttachmentThumb({
  attachment,
  onClick,
}: {
  attachment: AttachmentLike;
  onClick: () => void;
}) {
  const isImage = attachment.contentType.startsWith("image/");

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-[3/2] w-full overflow-hidden rounded-xl bg-surface-sunken"
    >
      {isImage ? (
        // biome-ignore lint/performance/noImgElement: /api/uploads/image redirects to a presigned S3 URL, not a static/known domain next/image's remotePatterns could target
        <img
          src={attachmentUrl(attachment.s3Key)}
          alt={attachment.fileName}
          className="h-full w-full object-contain"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-ink-muted">
          <DocumentIcon className="h-6 w-6" />
          <span className="max-w-full truncate text-xs">{attachment.fileName}</span>
        </div>
      )}
    </button>
  );
}
