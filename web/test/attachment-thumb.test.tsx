import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentThumb } from "@/components/attachment-thumb";

describe("AttachmentThumb", () => {
  it("renders an image preview for an image attachment", () => {
    render(
      <AttachmentThumb
        attachment={{
          s3Key: "cars/1/PHOTO/a.jpg",
          fileName: "front.jpg",
          contentType: "image/jpeg",
        }}
        onClick={vi.fn()}
      />
    );
    const img = screen.getByRole("img");
    expect(img.getAttribute("src")).toContain(encodeURIComponent("cars/1/PHOTO/a.jpg"));
  });

  it("falls back to a document glyph and filename for a non-image attachment", () => {
    render(
      <AttachmentThumb
        attachment={{
          s3Key: "cars/1/INSURANCE/a.pdf",
          fileName: "card.pdf",
          contentType: "application/pdf",
        }}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("card.pdf")).toBeInTheDocument();
  });
});
