"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AppUser } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: (active: boolean) => React.ReactNode;
}

function iconWrap(active: boolean, path: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 1.8}
      className="h-6 w-6"
    >
      {path}
    </svg>
  );
}

const BASE_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Garage",
    icon: (a) =>
      iconWrap(
        a,
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 11l1.5-4.5A2 2 0 0 1 6.4 5h11.2a2 2 0 0 1 1.9 1.5L21 11m-18 0v6a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h12v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-6m-18 0h18M7 15h.01M17 15h.01"
        />
      ),
  },
  {
    href: "/mechanics",
    label: "Mechanics",
    icon: (a) =>
      iconWrap(
        a,
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.4-3.4a5 5 0 0 1-6.8 6.8L4.5 22.5H2v-2.5l9.7-9.7a5 5 0 0 1 6.8-6.8l-3.4 3.4z"
        />
      ),
  },
];

function AdminIcon(active: boolean) {
  return iconWrap(
    active,
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"
    />
  );
}

export function NavShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const items = user.isAdmin
    ? [...BASE_ITEMS, { href: "/admin", label: "Admin", icon: AdminIcon }]
    : BASE_ITEMS;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const NavLinks = ({ vertical }: { vertical: boolean }) => (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex ${
              vertical
                ? "min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium"
                : "min-w-16 flex-col items-center gap-1 py-2 text-xs font-medium"
            } transition-colors ${
              active ? "text-accent" : "text-ink-muted hover:text-ink"
            } ${vertical && active ? "bg-accent-soft" : ""}`}
          >
            {item.icon(active)}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col border-r border-border bg-surface-raised p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <span className="text-lg font-semibold tracking-tight text-ink">🔧 Car Log</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          <NavLinks vertical />
        </nav>
        <div className="border-t border-border pt-3">
          <p className="truncate px-1 text-xs text-ink-muted">{user.email}</p>
          <button
            type="button"
            onClick={logout}
            className="mt-1 min-h-11 w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-surface-raised px-4 py-3 md:hidden">
        <span className="text-base font-semibold tracking-tight text-ink">🔧 Car Log</span>
        <button
          type="button"
          onClick={logout}
          className="min-h-11 rounded-xl px-3 text-sm font-medium text-ink-muted hover:bg-surface-sunken"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 pb-20 md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 flex justify-around border-t border-border bg-surface-raised pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLinks vertical={false} />
      </nav>
    </div>
  );
}
