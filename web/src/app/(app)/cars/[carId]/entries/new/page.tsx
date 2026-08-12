import { notFound } from "next/navigation";
import { EntryForm } from "@/components/entry-form";
import { PageHeader } from "@/components/ui/card";
import { getCar } from "@/lib/repo/cars";
import { listMechanics } from "@/lib/repo/mechanics";

export default async function NewEntryPage({ params }: { params: Promise<{ carId: string }> }) {
  const { carId } = await params;
  const [car, mechanics] = await Promise.all([getCar(carId), listMechanics()]);
  if (!car) notFound();

  return (
    <div>
      <PageHeader title={`Log maintenance — ${car.name}`} />
      <EntryForm carId={carId} mechanics={mechanics} />
    </div>
  );
}
