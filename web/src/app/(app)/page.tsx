import Link from "next/link";
import { CarCard } from "@/components/car-card";
import { PageHeader } from "@/components/ui/card";
import { listCars } from "@/lib/repo/cars";
import { getCarWithDetails } from "@/lib/repo/cars";
import { presignDownload } from "@/lib/s3";

export default async function GaragePage() {
  const cars = await listCars();

  const cards = await Promise.all(
    cars.map(async (car) => {
      const details = await getCarWithDetails(car.id);
      const cover = details?.photos[0];
      const coverUrl = cover ? await presignDownload(cover.s3Key) : undefined;
      return { car, coverUrl };
    })
  );

  return (
    <div>
      <PageHeader
        title="Garage"
        subtitle={`${cars.length} ${cars.length === 1 ? "car" : "cars"}`}
        action={
          <Link
            href="/cars/new"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"
          >
            + Add car
          </Link>
        }
      />

      {cars.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-3xl">🚗</p>
          <p className="mt-2 font-medium text-ink">No cars yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add your first car to start logging maintenance.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(({ car, coverUrl }) => (
            <CarCard key={car.id} car={car} coverUrl={coverUrl} />
          ))}
        </div>
      )}
    </div>
  );
}
