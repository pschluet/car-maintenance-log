import { redirect } from "next/navigation";
import { AdminUsersManager } from "@/components/admin-users-manager";
import { Card, PageHeader } from "@/components/ui/card";
import { listUsers } from "@/lib/cognito";
import { getCurrentUser } from "@/lib/session";

export default async function AdminPage() {
  // Middleware already restricts /admin to the Admins group; this is
  // defense-in-depth plus the source of currentUserEmail for the "you can't
  // remove yourself" affordance.
  const user = await getCurrentUser();
  if (!user?.isAdmin) redirect("/");

  // There's no local Cognito emulator (docker-compose only stands in for
  // DynamoDB and S3 — see LOCAL_AUTH in web/src/lib/session.ts), so user
  // management genuinely can't be exercised outside a deployed stack.
  // Skip the real call rather than crashing the page on the resulting
  // credential error.
  if (process.env.LOCAL_AUTH === "true") {
    return (
      <div>
        <PageHeader title="Admin" subtitle="Manage who can sign in" />
        <Card className="text-sm text-ink-muted">
          User management talks to Cognito directly and has no local stand-in — try this against the
          deployed app at {process.env.SITE_URL ?? "cars.pauldev.io"}.
        </Card>
      </div>
    );
  }

  const users = await listUsers();

  return (
    <div>
      <PageHeader title="Admin" subtitle="Manage who can sign in" />
      <AdminUsersManager initialUsers={users} currentUserEmail={user.email} />
    </div>
  );
}
