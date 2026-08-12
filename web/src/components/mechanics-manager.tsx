"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch, apiJson } from "@/lib/apiClient";
import type { Mechanic } from "@/lib/types";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Field, Input } from "./ui/input";

function emptyForm() {
  return { name: "", address: "", phone: "" };
}

export function MechanicsManager({ mechanics }: { mechanics: Mechanic[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  function startEdit(mechanic: Mechanic) {
    setEditingId(mechanic.id);
    setForm({ name: mechanic.name, address: mechanic.address ?? "", phone: mechanic.phone ?? "" });
    setAdding(true);
  }

  function cancel() {
    setAdding(false);
    setEditingId(undefined);
    setForm(emptyForm());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const input = {
        name: form.name,
        address: form.address || undefined,
        phone: form.phone || undefined,
      };
      if (editingId) {
        await apiJson(`/api/mechanics/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
      } else {
        await apiJson("/api/mechanics", { method: "POST", body: JSON.stringify(input) });
      }
      cancel();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(mechanicId: string) {
    await apiFetch(`/api/mechanics/${mechanicId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {!adding && (
        <Button onClick={() => setAdding(true)} className="w-full sm:w-auto">
          + Add mechanic
        </Button>
      )}

      {adding && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field label="Name" htmlFor="mech-name">
              <Input
                id="mech-name"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Joe's Garage"
              />
            </Field>
            <Field label="Address" htmlFor="mech-address">
              <Input
                id="mech-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </Field>
            <Field label="Phone" htmlFor="mech-phone">
              <Input
                id="mech-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="flex-1">
                {submitting ? "Saving…" : editingId ? "Save changes" : "Add mechanic"}
              </Button>
              <Button type="button" variant="ghost" onClick={cancel}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {mechanics.length === 0 && !adding ? (
        <p className="text-sm text-ink-muted">No mechanics added yet.</p>
      ) : (
        mechanics.map((mechanic) => (
          <Card key={mechanic.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-ink">{mechanic.name}</p>
              {mechanic.address && <p className="text-sm text-ink-muted">{mechanic.address}</p>}
              {mechanic.phone && <p className="text-sm text-ink-muted">{mechanic.phone}</p>}
            </div>
            <div className="flex shrink-0 gap-3 text-sm">
              <button
                type="button"
                onClick={() => startEdit(mechanic)}
                className="text-accent hover:underline"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(mechanic.id)}
                className="text-ink-muted hover:text-danger"
              >
                Delete
              </button>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
