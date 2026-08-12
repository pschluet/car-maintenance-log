"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "./ui/button";

export function DeleteCarButton({ carId, carName }: { carId: string; carName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" className="text-danger" onClick={() => setConfirming(true)}>
        Delete car
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-ink-muted">Delete {carName} and all its history?</span>
      <Button
        variant="danger"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await apiFetch(`/api/cars/${carId}`, { method: "DELETE" });
          router.push("/");
          router.refresh();
        }}
      >
        {busy ? "Deleting…" : "Confirm"}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
