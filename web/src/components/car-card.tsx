import Link from "next/link";
import { attachmentUrl } from "@/lib/attachment-url";
import type { Car } from "@/lib/types";

export function CarCard({ car, coverS3Key }: { car: Car; coverS3Key?: string }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken text-2xl">
        {coverS3Key ? <CoverImage s3Key={coverS3Key} /> : "🚗"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{car.name}</p>
        <p className="truncate text-sm text-ink-muted">
          {[car.year, car.color].filter(Boolean).join(" · ") || "No details yet"}
        </p>
        {car.licensePlate && (
          <p className="truncate font-mono text-xs text-ink-muted">{car.licensePlate}</p>
        )}
      </div>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        className="h-5 w-5 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

// /api/uploads/image redirects to a presigned S3 URL, not a static/known
// domain next/image's remotePatterns could target, so a plain <img> is the
// pragmatic choice.
function CoverImage({ s3Key }: { s3Key: string }) {
  // biome-ignore lint/performance/noImgElement: see comment above
  return <img src={attachmentUrl(s3Key)} alt="" className="h-full w-full object-cover" />;
}
