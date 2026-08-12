import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CollapsibleSection } from "@/components/ui/collapsible-section";

describe("CollapsibleSection", () => {
  it("starts collapsed and renders none of its children", () => {
    render(
      <CollapsibleSection title="Tire pressure & documents" summary="2 tire sets · 3 documents">
        <div>Tire sets content</div>
        <div>Insurance content</div>
      </CollapsibleSection>
    );

    expect(screen.getByRole("button", { name: /Tire pressure & documents/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
    expect(screen.queryByText("Tire sets content")).not.toBeInTheDocument();
    expect(screen.queryByText("Insurance content")).not.toBeInTheDocument();
  });

  it("reveals every child together on one click, and hides them all again on the next", async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSection title="Tire pressure & documents">
        <div>Tire sets content</div>
        <div>Insurance content</div>
      </CollapsibleSection>
    );

    const toggle = screen.getByRole("button", { name: /Tire pressure & documents/ });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Tire sets content")).toBeInTheDocument();
    expect(screen.getByText("Insurance content")).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Tire sets content")).not.toBeInTheDocument();
    expect(screen.queryByText("Insurance content")).not.toBeInTheDocument();
  });
});
