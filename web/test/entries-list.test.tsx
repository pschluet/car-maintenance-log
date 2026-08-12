import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntriesList } from "@/components/entries-list";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const baseEntry = {
  id: "e-1",
  carId: "car-1",
  date: "2026-01-01",
  mileage: 1000,
  notes: "",
  quickJobs: [],
  mechanicId: "diy",
  createdBy: "me@example.com",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

describe("EntriesList attachments", () => {
  it("shows no attachment affordance when an entry has none", () => {
    render(
      <EntriesList carId="car-1" entries={[{ ...baseEntry, attachments: [] }]} mechanics={[]} />
    );
    expect(screen.queryByRole("button", { name: /view.*attachment/i })).not.toBeInTheDocument();
  });

  it("shows a paperclip button with the count, and opens the viewer on click", async () => {
    const user = userEvent.setup();
    render(
      <EntriesList
        carId="car-1"
        entries={[
          {
            ...baseEntry,
            attachments: [
              {
                s3Key: "cars/1/ENTRY/a.jpg",
                fileName: "a.jpg",
                contentType: "image/jpeg",
                size: 1,
              },
              {
                s3Key: "cars/1/ENTRY/b.jpg",
                fileName: "b.jpg",
                contentType: "image/jpeg",
                size: 1,
              },
            ],
          },
        ]}
        mechanics={[]}
      />
    );

    const button = screen.getByRole("button", { name: "View 2 attachments" });
    await user.click(button);

    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });
});
