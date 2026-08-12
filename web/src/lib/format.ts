import { DIY_MECHANIC_ID, QUICK_JOBS, type QuickJobId } from "./types";

export function todayLocalDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function formatDateDisplay(isoDate: string): string {
  // Parsed as a local calendar date (not UTC midnight) so it never appears
  // to shift a day depending on the viewer's timezone.
  const [y, m, d] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function quickJobLabel(id: QuickJobId | string): string {
  return QUICK_JOBS.find((j) => j.id === id)?.label ?? id;
}

export function mechanicDisplayName(
  mechanicId: string,
  mechanics: { id: string; name: string }[]
): string {
  if (mechanicId === DIY_MECHANIC_ID) return "Myself (DIY)";
  return mechanics.find((m) => m.id === mechanicId)?.name ?? "Unknown mechanic";
}

export function formatMileage(mileage: number): string {
  return `${mileage.toLocaleString()} mi`;
}
