import { notFound } from "next/navigation";
import { EntryForm } from "@/components/entry-form";
import { PageHeader } from "@/components/ui/card";
import { getCar } from "@/lib/repo/cars";
import { getEntry } from "@/lib/repo/entries";
import { listMechanics } from "@/lib/repo/mechanics";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ carId: string; entryId: string }>;
}) {
  const { carId, entryId } = await params;
  const [car, entry, mechanics] = await Promise.all([
    getCar(carId),
    getEntry(carId, entryId),
    listMechanics(),
  ]);
  if (!car || !entry) notFound();

  return (
    <div>
      <PageHeader title={`Edit entry — ${car.name}`} />
      <EntryForm carId={carId} mechanics={mechanics} entry={entry} />
    </div>
  );
}
