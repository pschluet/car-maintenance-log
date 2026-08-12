import { CarForm } from "@/components/car-form";
import { PageHeader } from "@/components/ui/card";

export default function NewCarPage() {
  return (
    <div>
      <PageHeader title="Add a car" />
      <CarForm />
    </div>
  );
}
