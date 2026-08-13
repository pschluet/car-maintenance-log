"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { AppUser } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  /** Path subtrees that light this item up. Explicit rather than derived from
   * `href` because "/" prefix-matches every route, and because car pages live
   * under /cars but belong to the Garage tab. */
  activePrefixes: string[];
  icon: (active: boolean) => React.ReactNode;
}

function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  return item.activePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
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
    activePrefixes: ["/cars"],
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
    activePrefixes: ["/mechanics"],
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

const ADMIN_ITEM: NavItem = {
  href: "/admin",
  label: "Admin",
  activePrefixes: ["/admin"],
  icon: AdminIcon,
};

/** Three bars that slide to the middle and cross into an X. The whole morph
 * is driven off the toggle button's aria-expanded via group-aria-expanded:*,
 * so "open" has exactly one source of truth. Spans rather than an SVG:
 * Tailwind's transform utilities assume an HTML box (SVG children rotate
 * about the viewBox origin unless transform-box is overridden, and arbitrary
 * px translations are scaled by the viewBox). */
function HamburgerIcon() {
  return (
    <span aria-hidden="true" className="relative block h-4 w-6">
      <span className="absolute left-0 top-0 h-0.5 w-6 rounded-full bg-current transition-transform duration-200 ease-out group-aria-expanded:translate-y-[7px] group-aria-expanded:rotate-45 motion-reduce:transition-none" />
      <span className="absolute left-0 top-[7px] h-0.5 w-6 rounded-full bg-current transition-[opacity,scale] duration-200 ease-out group-aria-expanded:scale-x-0 group-aria-expanded:opacity-0 motion-reduce:transition-none" />
      <span className="absolute left-0 top-[14px] h-0.5 w-6 rounded-full bg-current transition-transform duration-200 ease-out group-aria-expanded:-translate-y-[7px] group-aria-expanded:-rotate-45 motion-reduce:transition-none" />
    </span>
  );
}

function NavLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active ? "bg-accent-soft text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {item.icon(active)}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );
}

export function NavShell({ user, children }: { user: AppUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  const items = user.isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

  function closeMenu() {
    setMenuOpen(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Escape closes and hands focus back to the toggle. Mirrors the keydown
  // listener in attachment-viewer.tsx, but attached only while open.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Back/forward gestures navigate without a click on one of our links.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 flex-col border-r border-border bg-surface-raised p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-1">
          <span className="text-lg font-semibold tracking-tight text-ink">🔧 Car Log</span>
        </div>
        <nav aria-label="Primary" className="flex flex-1 flex-col gap-1">
          <NavLinks items={items} pathname={pathname} />
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
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface-raised px-4 md:hidden">
        <span className="text-base font-semibold tracking-tight text-ink">🔧 Car Log</span>
        <button
          ref={toggleRef}
          type="button"
          aria-label="Main menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen((v) => !v)}
          className="group -mr-2 flex h-11 w-11 items-center justify-center rounded-xl text-ink"
        >
          <HamburgerIcon />
        </button>

        {/* Dims the page behind the open menu and closes it on tap. A
            <button> rather than a <div>: iOS Safari only reliably dispatches
            click events for natively clickable elements, and it gives the
            test suite a role-based handle. inert keeps it out of the a11y
            tree and unclickable while closed without unmounting it, so the
            fade-out survives. */}
        <button
          type="button"
          aria-label="Close menu"
          tabIndex={-1}
          inert={!menuOpen}
          onClick={closeMenu}
          className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-200 ease-out motion-reduce:transition-none ${
            menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <div
          id={menuId}
          inert={!menuOpen}
          className={`absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-3.5rem)] origin-top overflow-y-auto overscroll-contain border-b border-border bg-surface-raised shadow-lg transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none ${
            menuOpen ? "scale-y-100 opacity-100" : "pointer-events-none scale-y-95 opacity-0"
          }`}
        >
          <nav aria-label="Primary" className="flex flex-col gap-1 p-3">
            <NavLinks items={items} pathname={pathname} onNavigate={closeMenu} />
          </nav>
          <div className="border-t border-border p-3">
            <p className="truncate px-3 pb-1 text-xs text-ink-muted">{user.email}</p>
            <button
              type="button"
              onClick={() => {
                closeMenu();
                logout();
              }}
              className="min-h-11 w-full rounded-xl px-3 text-left text-sm font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
