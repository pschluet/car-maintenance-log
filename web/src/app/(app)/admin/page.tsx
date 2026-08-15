import { redirect } from "next/navigation";
import { AdminUsersManager } from "@/components/admin-users-manager";
import { MaintenanceLogImporter } from "@/components/maintenance-log-importer";
import { Card, PageHeader } from "@/components/ui/card";
import { listUsers } from "@/lib/cognito";
import { listCars } from "@/lib/repo/cars";
import { getCurrentUser } from "@/lib/session";
import { siteOrigin } from "@/lib/site-url";

export default async function AdminPage() {
  // Middleware already restricts /admin to the Admins group; this is
  // defense-in-depth plus the source of currentUserEmail for the "you can't
  // remove yourself" affordance.
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  const cars = await listCars();

  // There's no local Cognito emulator (docker-compose only stands in for
  // DynamoDB and S3 — see LOCAL_AUTH in web/src/lib/session.ts), so user
  // management genuinely can't be exercised outside a deployed stack. The CSV
  // importer only touches DynamoDB, though, so it works locally either way.
  const isLocal = process.env.LOCAL_AUTH === "true";

  return (
    <div className="space-y-8">
      <div>
        <PageHeader title="Admin" subtitle="Manage who can sign in" />
        {isLocal ? (
          <Card className="text-sm text-ink-muted">
            User management talks to Cognito directly and has no local stand-in — try this against
            the deployed app at {siteOrigin("https://cars.pauldev.io")}.
          </Card>
        ) : (
          <AdminUsersManager initialUsers={await listUsers()} currentUserEmail={user.email} />
        )}
      </div>

      <div>
        <PageHeader
          title="Import maintenance log"
          subtitle="Upload a CSV to bulk-add entries to a car"
        />
        <MaintenanceLogImporter cars={cars} />
      </div>
    </div>
  );
}
