import { notFound } from "next/navigation";
import { CarForm } from "@/components/car-form";
import { PageHeader } from "@/components/ui/card";
import { getCar } from "@/lib/repo/cars";

export default async function EditCarPage({ params }: { params: Promise<{ carId: string }> }) {
  const { carId } = await params;
  const car = await getCar(carId);
  if (!car) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${car.name}`} />
      <CarForm car={car} />
    </div>
  );
}
