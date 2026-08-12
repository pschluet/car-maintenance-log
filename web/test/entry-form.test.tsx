import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntryForm } from "@/components/entry-form";
import { todayLocalDate } from "@/lib/format";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

describe("EntryForm", () => {
  it("defaults the date field to today and the mechanic to DIY", () => {
    render(<EntryForm carId="car-1" mechanics={[]} />);

    expect(screen.getByLabelText("Date")).toHaveValue(todayLocalDate());
    expect(screen.getByLabelText("Performed by")).toHaveValue("diy");
  });

  it("allows selecting multiple quick jobs at once", async () => {
    const user = userEvent.setup();
    render(<EntryForm carId="car-1" mechanics={[]} />);

    const oilChange = screen.getByRole("button", { name: "Oil change" });
    const tireRotation = screen.getByRole("button", { name: "Tire rotation" });

    expect(oilChange).toHaveAttribute("aria-pressed", "false");
    await user.click(oilChange);
    await user.click(tireRotation);

    expect(oilChange).toHaveAttribute("aria-pressed", "true");
    expect(tireRotation).toHaveAttribute("aria-pressed", "true");
  });

  it("lets a mechanic from the directory be selected instead of DIY", async () => {
    const user = userEvent.setup();
    render(
      <EntryForm
        carId="car-1"
        mechanics={[{ id: "m-1", name: "Joe's Garage", createdAt: "2026-01-01" }]}
      />
    );

    const select = screen.getByLabelText("Performed by");
    await user.selectOptions(select, "m-1");
    expect(select).toHaveValue("m-1");
  });

  it("only accepts digits in the mileage field", async () => {
    const user = userEvent.setup();
    render(<EntryForm carId="car-1" mechanics={[]} />);

    const mileage = screen.getByLabelText("Mileage");
    await user.type(mileage, "8ab2,000");
    expect(mileage).toHaveValue("82000");
  });
});
