import { MechanicsManager } from "@/components/mechanics-manager";
import { PageHeader } from "@/components/ui/card";
import { listMechanics } from "@/lib/repo/mechanics";

export default async function MechanicsPage() {
  const mechanics = await listMechanics();

  return (
    <div>
      <PageHeader title="Mechanics" subtitle="Who's worked on the cars" />
      <MechanicsManager mechanics={mechanics} />
    </div>
  );
}
