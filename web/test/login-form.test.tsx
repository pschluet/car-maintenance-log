import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/login/login-form";

const pushMock = vi.fn();
const refreshMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => searchParams,
}));

async function signIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email address"), "a@example.com");
  await user.click(screen.getByRole("button", { name: "Send sign-in code" }));
  await screen.findByLabelText("Verification code");
  await user.type(screen.getByLabelText("Verification code"), "123456");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await vi.waitFor(() => expect(pushMock).toHaveBeenCalled());
}

describe("LoginForm", () => {
  beforeEach(() => {
    pushMock.mockReset();
    refreshMock.mockReset();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("navigates to a same-origin `next` after a successful sign-in", async () => {
    searchParams = new URLSearchParams({ next: "/cars/5?tab=notes" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await signIn(user);

    expect(pushMock).toHaveBeenCalledWith("/cars/5?tab=notes");
  });

  it("refuses to navigate off-site for a crafted `next` value", async () => {
    // A /login?next=https://evil.com link, sent to a victim who then signs
    // in normally, must not send their browser to evil.com afterward.
    searchParams = new URLSearchParams({ next: "https://evil.com" });
    const user = userEvent.setup();
    render(<LoginForm />);

    await signIn(user);

    expect(pushMock).toHaveBeenCalledWith("/");
  });
});
