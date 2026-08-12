import { db, keys } from "../db";
import type { MechanicInput } from "../schemas";
import type { Mechanic } from "../types";

export async function listMechanics(): Promise<Mechanic[]> {
  const rows = await db.queryGsi1<Mechanic>("MECHANICS");
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMechanic(mechanicId: string): Promise<Mechanic | undefined> {
  return db.get<Mechanic>(keys.mechanic(mechanicId));
}

export async function createMechanic(input: MechanicInput): Promise<Mechanic> {
  const id = crypto.randomUUID();
  const mechanic: Mechanic = { id, ...input, createdAt: new Date().toISOString() };
  await db.put({ ...keys.mechanic(id), ...keys.mechanicGsi(mechanic.name), ...mechanic });
  return mechanic;
}

export async function updateMechanic(mechanicId: string, input: MechanicInput): Promise<Mechanic> {
  const existing = await getMechanic(mechanicId);
  const mechanic: Mechanic = {
    id: mechanicId,
    ...input,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };
  await db.put({ ...keys.mechanic(mechanicId), ...keys.mechanicGsi(mechanic.name), ...mechanic });
  return mechanic;
}

export async function deleteMechanic(mechanicId: string): Promise<void> {
  await db.delete(keys.mechanic(mechanicId));
}
