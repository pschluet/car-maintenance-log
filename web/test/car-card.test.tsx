import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CarCard } from "@/components/car-card";

const baseCar = {
  id: "car-1",
  name: "Sarah's CR-V",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("CarCard", () => {
  it("shows the license plate when the car has one", () => {
    render(<CarCard car={{ ...baseCar, licensePlate: "ABC-1234" }} />);
    expect(screen.getByText("ABC-1234")).toBeInTheDocument();
  });

  it("renders no plate line when the car has none", () => {
    const { container } = render(<CarCard car={baseCar} />);
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });
});
