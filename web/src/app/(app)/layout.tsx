import { redirect } from "next/navigation";
import { NavShell } from "@/components/nav-shell";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Middleware already blocks unauthenticated requests from reaching here;
  // this is a defense-in-depth check and the source of the user data the
  // nav shell renders (name, admin link).
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <NavShell user={user}>{children}</NavShell>;
}
