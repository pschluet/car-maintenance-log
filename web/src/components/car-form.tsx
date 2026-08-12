"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiJson } from "@/lib/apiClient";
import type { Car } from "@/lib/types";
import { Button } from "./ui/button";
import { Field, Input } from "./ui/input";

export function CarForm({ car }: { car?: Car }) {
  const router = useRouter();
  const [name, setName] = useState(car?.name ?? "");
  const [year, setYear] = useState(car?.year?.toString() ?? "");
  const [color, setColor] = useState(car?.color ?? "");
  const [vin, setVin] = useState(car?.vin ?? "");
  const [licensePlate, setLicensePlate] = useState(car?.licensePlate ?? "");
  const [error, setError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(undefined);
    try {
      const input = {
        name,
        year: year ? Number(year) : undefined,
        color: color || undefined,
        vin: vin || undefined,
        licensePlate: licensePlate || undefined,
      };
      if (car) {
        const { car: updated } = await apiJson<{ car: Car }>(`/api/cars/${car.id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        router.push(`/cars/${updated.id}`);
      } else {
        const { car: created } = await apiJson<{ car: Car }>("/api/cars", {
          method: "POST",
          body: JSON.stringify(input),
        });
        router.push(`/cars/${created.id}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Name" htmlFor="name">
        <Input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sarah's CR-V"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Year" htmlFor="year">
          <Input
            id="year"
            inputMode="numeric"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="2021"
          />
        </Field>
        <Field label="Color" htmlFor="color">
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Deep Blue"
          />
        </Field>
      </div>
      <Field label="VIN" htmlFor="vin">
        <Input
          id="vin"
          value={vin}
          onChange={(e) => setVin(e.target.value.toUpperCase())}
          maxLength={17}
          className="font-mono uppercase"
        />
      </Field>
      <Field label="License plate" htmlFor="plate">
        <Input
          id="plate"
          value={licensePlate}
          onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
          className="font-mono uppercase"
        />
      </Field>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Saving…" : car ? "Save changes" : "Add car"}
      </Button>
    </form>
  );
}
