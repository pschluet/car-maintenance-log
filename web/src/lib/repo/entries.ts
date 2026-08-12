import { db, keys } from "../db";
import { deleteObject } from "../s3";
import type { EntryInput } from "../schemas";
import type { MaintenanceEntry } from "../types";

export async function listEntries(carId: string): Promise<MaintenanceEntry[]> {
  // Sort key is ENTRY#<date>#<id>, so a reverse scan returns newest-first
  // for free with no in-app sorting needed.
  return db.queryByPk<MaintenanceEntry>(`CAR#${carId}`, {
    skPrefix: "ENTRY#",
    scanIndexForward: false,
  });
}

export async function getEntry(
  carId: string,
  entryId: string
): Promise<MaintenanceEntry | undefined> {
  const entries = await listEntries(carId);
  return entries.find((e) => e.id === entryId);
}

export async function createEntry(
  carId: string,
  input: EntryInput,
  createdBy: string
): Promise<MaintenanceEntry> {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const entry: MaintenanceEntry = {
    id,
    carId,
    ...input,
    createdBy,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.put({ ...keys.entry(carId, entry.date, id), ...entry });
  return entry;
}

export async function updateEntry(
  carId: string,
  entryId: string,
  input: EntryInput
): Promise<MaintenanceEntry> {
  const existing = await getEntry(carId, entryId);
  if (!existing) throw new Error("Entry not found");

  const removedAttachments = existing.attachments.filter(
    (a) => !input.attachments.some((b) => b.s3Key === a.s3Key)
  );

  const entry: MaintenanceEntry = { ...existing, ...input, updatedAt: new Date().toISOString() };

  // The date is part of the sort key, so a date change means writing a new
  // item and deleting the old one rather than an in-place update.
  if (existing.date !== entry.date) {
    await db.delete(keys.entry(carId, existing.date, entryId));
  }
  await db.put({ ...keys.entry(carId, entry.date, entryId), ...entry });
  await Promise.all(removedAttachments.map((a) => deleteObject(a.s3Key)));
  return entry;
}

export async function deleteEntry(carId: string, entryId: string): Promise<void> {
  const existing = await getEntry(carId, entryId);
  if (!existing) return;
  await Promise.all(existing.attachments.map((a) => deleteObject(a.s3Key)));
  await db.delete(keys.entry(carId, existing.date, entryId));
}
