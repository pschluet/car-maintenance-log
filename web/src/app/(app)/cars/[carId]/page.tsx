import Link from "next/link";
import { notFound } from "next/navigation";
import { CarDocsSection } from "@/components/car-docs-section";
import { CarPhotosSection } from "@/components/car-photos-section";
import { DeleteCarButton } from "@/components/delete-car-button";
import { EntriesList } from "@/components/entries-list";
import { TireSetsSection } from "@/components/tire-sets-section";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { getCarWithDetails } from "@/lib/repo/cars";
import { listEntries } from "@/lib/repo/entries";
import { listMechanics } from "@/lib/repo/mechanics";
import { presignDownload } from "@/lib/s3";
import type { CarDoc } from "@/lib/types";

async function withViewUrls(docs: CarDoc[]) {
  return Promise.all(
    docs.map(async (doc) => ({ ...doc, viewUrl: await presignDownload(doc.s3Key) }))
  );
}

export default async function CarDetailPage({ params }: { params: Promise<{ carId: string }> }) {
  const { carId } = await params;
  const [car, entries, mechanics] = await Promise.all([
    getCarWithDetails(carId),
    listEntries(carId),
    listMechanics(),
  ]);
  if (!car) notFound();

  const [photos, insuranceDocs, registrationDocs] = await Promise.all([
    withViewUrls(car.photos),
    withViewUrls(car.insuranceDocs),
    withViewUrls(car.registrationDocs),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={car.name}
        subtitle={[car.year, car.color, car.licensePlate].filter(Boolean).join(" · ") || undefined}
        action={
          <Link href={`/cars/${carId}/edit`}>
            <Button variant="secondary">Edit</Button>
          </Link>
        }
      />

      <CarPhotosSection carId={carId} photos={photos} />

      <Card>
        <h2 className="mb-3 font-medium text-ink">Specifications</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-ink-muted">VIN</dt>
            <dd className="font-mono text-ink">{car.vin || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">License plate</dt>
            <dd className="font-mono text-ink">{car.licensePlate || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Year</dt>
            <dd className="text-ink">{car.year || "—"}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Color</dt>
            <dd className="text-ink">{car.color || "—"}</dd>
          </div>
        </dl>
      </Card>

      <TireSetsSection carId={carId} tireSets={car.tireSets} />

      <CarDocsSection carId={carId} kind="INSURANCE" title="Insurance card" docs={insuranceDocs} />
      <CarDocsSection
        carId={carId}
        kind="REGISTRATION"
        title="Registration"
        docs={registrationDocs}
      />

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-ink">Maintenance log</h2>
          <Link href={`/cars/${carId}/entries/new`}>
            <Button>+ Add entry</Button>
          </Link>
        </div>
        <EntriesList carId={carId} entries={entries} mechanics={mechanics} />
      </div>

      <div className="border-t border-border pt-4">
        <DeleteCarButton carId={carId} carName={car.name} />
      </div>
    </div>
  );
}
