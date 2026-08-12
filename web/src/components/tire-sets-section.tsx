"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, apiJson } from "@/lib/apiClient";
import type { TireSet } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, Input } from "./ui/input";

const POSITIONS: { key: keyof TireSet; label: string }[] = [
  { key: "frontLeftPsi", label: "Front left" },
  { key: "frontRightPsi", label: "Front right" },
  { key: "rearLeftPsi", label: "Rear left" },
  { key: "rearRightPsi", label: "Rear right" },
];

function emptyForm() {
  return { label: "", frontLeftPsi: "", frontRightPsi: "", rearLeftPsi: "", rearRightPsi: "" };
}

export function TireSetsSection({ carId, tireSets }: { carId: string; tireSets: TireSet[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiJson(`/api/cars/${carId}/tire-sets`, {
        method: "POST",
        body: JSON.stringify({
          label: form.label,
          frontLeftPsi: form.frontLeftPsi ? Number(form.frontLeftPsi) : undefined,
          frontRightPsi: form.frontRightPsi ? Number(form.frontRightPsi) : undefined,
          rearLeftPsi: form.rearLeftPsi ? Number(form.rearLeftPsi) : undefined,
          rearRightPsi: form.rearRightPsi ? Number(form.rearRightPsi) : undefined,
        }),
      });
      setForm(emptyForm());
      setAdding(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(tireSetId: string) {
    await apiFetch(`/api/cars/${carId}/tire-sets/${tireSetId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium text-ink">Tire pressure</h2>
        <Button variant="secondary" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add set"}
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 rounded-xl bg-surface-sunken p-3">
          <Field label="Label" htmlFor="tireset-label">
            <Input
              id="tireset-label"
              required
              placeholder="Summer, Winter/Snow, etc."
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {POSITIONS.map(({ key, label }) => (
              <Field key={key} label={`${label} (psi)`} htmlFor={key}>
                <Input
                  id={key}
                  inputMode="decimal"
                  value={form[key as "frontLeftPsi"]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving…" : "Save tire set"}
          </Button>
        </form>
      )}

      {tireSets.length === 0 ? (
        <p className="text-sm text-ink-muted">No tire sets recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {tireSets.map((set) => (
            <div key={set.id} className="rounded-xl bg-surface-sunken p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="font-medium text-ink">{set.label}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(set.id)}
                  className="text-sm text-ink-muted hover:text-danger"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm text-ink-muted sm:grid-cols-4">
                {POSITIONS.map(({ key, label }) => (
                  <p key={key}>
                    {label}: <span className="text-ink">{set[key] ?? "—"}</span>
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
