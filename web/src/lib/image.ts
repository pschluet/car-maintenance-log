"use client";

// Downscales a phone photo client-side before upload. Vehicle insurance
// cards, registration pages, and receipts are legible well under 1600px on
// the long edge, and shrinking here means faster uploads and no server-side
// resizing pipeline to maintain.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

export async function downscaleImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;

    const newName = `${file.name.replace(/\.\w+$/, "")}.jpg`;
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // createImageBitmap can fail on some formats (e.g. HEIC in some
    // browsers) — fall back to uploading the original rather than blocking.
    return file;
  }
}
