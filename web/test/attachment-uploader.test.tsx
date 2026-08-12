import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentUploader } from "@/components/attachment-uploader";

describe("AttachmentUploader", () => {
  it("does not set `capture` on the primary input, so iOS offers the photo library and Files rather than only the camera, and keeps `multiple`", () => {
    const { container } = render(
      <AttachmentUploader carId="car-1" kind="ENTRY" multiple onUploaded={vi.fn()} />
    );
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="file"]');
    expect(inputs).toHaveLength(2);

    const [primary, camera] = inputs;
    expect(primary).not.toHaveAttribute("capture");
    expect(primary).toHaveAttribute("multiple");

    // The secondary camera shortcut is intentionally capture-only and single-file.
    expect(camera).toHaveAttribute("capture", "environment");
    expect(camera).not.toHaveAttribute("multiple");
  });
});
