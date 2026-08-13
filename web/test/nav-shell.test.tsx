import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NavShell } from "@/components/nav-shell";
import type { AppUser } from "@/lib/types";

// Responsive Tailwind classes (md:hidden / md:flex) don't apply in jsdom, so
// the desktop sidebar and the mobile header both render at once. Scope
// queries by landmark role instead of adding test-only markup: the mobile
// bar is a <header> not nested in another landmark, so it's role="banner";
// the sidebar is an <aside>, so it's role="complementary". No matchMedia
// stub is needed anywhere in this file — breakpoint behavior is pure CSS.
const mocks = vi.hoisted(() => ({ push: vi.fn(), pathname: { current: "/" } }));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.current,
  useRouter: () => ({ push: mocks.push, refresh: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    onClick,
    ...props
  }: React.ComponentProps<"a"> & { children: React.ReactNode }) => (
    <a
      {...props}
      // biome-ignore lint/a11y/useValidAnchor: href is forwarded via ...props; this stubs next/link for tests
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e as unknown as React.MouseEvent<HTMLAnchorElement>);
      }}
    >
      {children}
    </a>
  ),
}));

const baseUser: AppUser = { sub: "user-1", email: "paul@example.com", isAdmin: false };
const adminUser: AppUser = { sub: "admin-1", email: "admin@example.com", isAdmin: true };

function getMobilePanel() {
  const toggle = screen.getByRole("button", { name: "Main menu" });
  const panelId = toggle.getAttribute("aria-controls");
  const panel = panelId ? document.getElementById(panelId) : null;
  if (!panel) throw new Error("menu panel not found via aria-controls");
  return { toggle, panel };
}

beforeEach(() => {
  mocks.pathname.current = "/";
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("NavShell mobile menu", () => {
  it("starts closed", () => {
    render(<NavShell user={baseUser}>content</NavShell>);
    const { toggle, panel } = getMobilePanel();
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("inert");
  });

  it("opens on toggle click and closes again on a second click", async () => {
    const user = userEvent.setup();
    render(<NavShell user={baseUser}>content</NavShell>);
    const { toggle, panel } = getMobilePanel();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(panel).not.toHaveAttribute("inert");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(panel).toHaveAttribute("inert");
  });

  it("closes when a nav item in the mobile menu is clicked", async () => {
    const user = userEvent.setup();
    render(<NavShell user={baseUser}>content</NavShell>);
    const { toggle } = getMobilePanel();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    const banner = within(screen.getByRole("banner"));
    await user.click(banner.getByRole("link", { name: "Mechanics" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    render(<NavShell user={baseUser}>content</NavShell>);
    const { toggle } = getMobilePanel();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the toggle", async () => {
    const user = userEvent.setup();
    render(<NavShell user={baseUser}>content</NavShell>);
    const { toggle } = getMobilePanel();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveFocus();
  });

  it("only shows the Admin link for admin users, in both the menu and the sidebar", () => {
    const { rerender } = render(<NavShell user={baseUser}>content</NavShell>);
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();

    rerender(<NavShell user={adminUser}>content</NavShell>);
    const banner = within(screen.getByRole("banner"));
    const sidebar = within(screen.getByRole("complementary"));
    expect(banner.getByRole("link", { name: "Admin" })).toBeInTheDocument();
    expect(sidebar.getByRole("link", { name: "Admin" })).toBeInTheDocument();
  });

  it("marks only the current route's link, not Garage on every route (regression)", () => {
    mocks.pathname.current = "/mechanics";
    render(<NavShell user={baseUser}>content</NavShell>);
    const banner = within(screen.getByRole("banner"));

    expect(banner.getByRole("link", { current: "page" })).toHaveAccessibleName("Mechanics");
    expect(banner.getByRole("link", { name: "Garage" })).not.toHaveAttribute("aria-current");
  });

  it("treats car sub-routes as belonging to the Garage tab", () => {
    mocks.pathname.current = "/cars/car-1";
    render(<NavShell user={baseUser}>content</NavShell>);
    const banner = within(screen.getByRole("banner"));

    expect(banner.getByRole("link", { current: "page" })).toHaveAccessibleName("Garage");
  });

  it("no longer renders a third (bottom tab bar) navigation landmark", () => {
    render(<NavShell user={baseUser}>content</NavShell>);
    // Sidebar nav + mobile menu nav only.
    expect(screen.getAllByRole("navigation")).toHaveLength(2);
  });

  it("signs out from the mobile menu", async () => {
    const user = userEvent.setup();
    render(<NavShell user={baseUser}>content</NavShell>);
    const { toggle } = getMobilePanel();

    await user.click(toggle);
    const banner = within(screen.getByRole("banner"));
    await user.click(banner.getByRole("button", { name: "Sign out" }));

    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
    expect(mocks.push).toHaveBeenCalledWith("/login");
  });
});
