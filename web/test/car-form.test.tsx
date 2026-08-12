import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CarForm } from "@/components/car-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("CarForm", () => {
  it("pre-fills fields when editing an existing car", () => {
    render(
      <CarForm
        car={{
          id: "car-1",
          name: "Sarah's CR-V",
          year: 2021,
          color: "Blue",
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
        }}
      />
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Sarah's CR-V");
    expect(screen.getByLabelText("Year")).toHaveValue("2021");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });

  it("uppercases VIN and license plate as they're typed", async () => {
    const user = userEvent.setup();
    render(<CarForm />);

    const vin = screen.getByLabelText("VIN");
    await user.type(vin, "1hgcm82633a123456");
    expect(vin).toHaveValue("1HGCM82633A123456");
  });

  it("shows the create-mode submit label for a new car", () => {
    render(<CarForm />);
    expect(screen.getByRole("button", { name: "Add car" })).toBeInTheDocument();
  });
});
