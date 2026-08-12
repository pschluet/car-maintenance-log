import Link from "next/link";
import type { Car } from "@/lib/types";

export function CarCard({ car, coverUrl }: { car: Car; coverUrl?: string }) {
  return (
    <Link
      href={`/cars/${car.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-sunken text-2xl">
        {coverUrl ? <CoverImage src={coverUrl} /> : "🚗"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{car.name}</p>
        <p className="truncate text-sm text-ink-muted">
          {[car.year, car.color].filter(Boolean).join(" · ") || "No details yet"}
        </p>
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

// Presigned S3 URLs aren't a static/known domain next/image's
// remotePatterns could target, so a plain <img> is the pragmatic choice.
function CoverImage({ src }: { src: string }) {
  // biome-ignore lint/performance/noImgElement: see comment above
  return <img src={src} alt="" className="h-full w-full object-cover" />;
}
