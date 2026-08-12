import Link from "next/link";
import { notFound } from "next/navigation";
import { CarDocsSection } from "@/components/car-docs-section";
import { CarPhotosSection } from "@/components/car-photos-section";
import { DeleteCarButton } from "@/components/delete-car-button";
import { EntriesList } from "@/components/entries-list";
import { TireSetsSection } from "@/components/tire-sets-section";
import { Button } from "@/components/ui/button";
import { Card, PageHeader } from "@/components/ui/card";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { getCarWithDetails } from "@/lib/repo/cars";
import { listEntries } from "@/lib/repo/entries";
import { listMechanics } from "@/lib/repo/mechanics";

export default async function CarDetailPage({ params }: { params: Promise<{ carId: string }> }) {
  const { carId } = await params;
  const [car, entries, mechanics] = await Promise.all([
    getCarWithDetails(carId),
    listEntries(carId),
    listMechanics(),
  ]);
  if (!car) notFound();

  const docCount = car.insuranceDocs.length + car.registrationDocs.length;
  const tireSetsSummary = `${car.tireSets.length} tire set${car.tireSets.length === 1 ? "" : "s"}`;
  const docsSummary = `${docCount} document${docCount === 1 ? "" : "s"}`;

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

      <CarPhotosSection carId={carId} photos={car.photos} />

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

      <CollapsibleSection
        title="Tire pressure & documents"
        summary={`${tireSetsSummary} · ${docsSummary}`}
      >
        <TireSetsSection carId={carId} tireSets={car.tireSets} />
        <CarDocsSection
          carId={carId}
          kind="INSURANCE"
          title="Insurance card"
          docs={car.insuranceDocs}
        />
        <CarDocsSection
          carId={carId}
          kind="REGISTRATION"
          title="Registration"
          docs={car.registrationDocs}
        />
      </CollapsibleSection>

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
