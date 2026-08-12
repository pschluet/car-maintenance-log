"use client";

import { useRef, useState } from "react";
import { apiJson } from "@/lib/apiClient";
import { downscaleImage } from "@/lib/image";
import type { Attachment } from "@/lib/types";
import { Button } from "./ui/button";

interface Props {
  carId: string;
  kind: "ENTRY" | "PHOTO" | "INSURANCE" | "REGISTRATION";
  multiple?: boolean;
  label?: string;
  onUploaded: (attachment: Attachment) => void;
}

export function AttachmentUploader({ carId, kind, multiple, label, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function uploadOne(rawFile: File) {
    const file = await downscaleImage(rawFile);
    const { uploadUrl, s3Key } = await apiJson<{ uploadUrl: string; s3Key: string }>(
      "/api/uploads",
      {
        method: "POST",
        body: JSON.stringify({ fileName: file.name, contentType: file.type, carId, kind }),
      }
    );
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) throw new Error("Upload to storage failed");
    onUploaded({ s3Key, fileName: rawFile.name, contentType: file.type, size: file.size });
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    setError(undefined);
    try {
      for (const file of files) await uploadOne(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "Uploading…" : (label ?? "Add photo")}
      </Button>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
