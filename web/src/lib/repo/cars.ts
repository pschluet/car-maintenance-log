import { db, keys } from "../db";
import { deleteObject } from "../s3";
import type { CarDocInput, CarInput, TireSetInput } from "../schemas";
import type { Car, CarDoc, CarWithDetails, TireSet } from "../types";

function nowIso(): string {
  return new Date().toISOString();
}

export async function listCars(): Promise<Car[]> {
  const rows = await db.queryGsi1<Car>("CARS");
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getCar(carId: string): Promise<Car | undefined> {
  return db.get<Car>(keys.car(carId));
}

export async function getCarWithDetails(carId: string): Promise<CarWithDetails | undefined> {
  const [car, rows] = await Promise.all([
    getCar(carId),
    db.queryByPk<CarDoc | TireSet>(`CAR#${carId}`),
  ]);
  if (!car) return undefined;

  const tireSets: TireSet[] = [];
  const photos: CarDoc[] = [];
  const insuranceDocs: CarDoc[] = [];
  const registrationDocs: CarDoc[] = [];

  for (const row of rows) {
    const sk = (row as { sk?: string }).sk ?? "";
    if (sk.startsWith("TIRESET#")) {
      tireSets.push(row as TireSet);
    } else if (sk.startsWith("DOC#PHOTO#")) {
      photos.push(row as CarDoc);
    } else if (sk.startsWith("DOC#INSURANCE#")) {
      insuranceDocs.push(row as CarDoc);
    } else if (sk.startsWith("DOC#REGISTRATION#")) {
      registrationDocs.push(row as CarDoc);
    }
  }

  return { ...car, tireSets, photos, insuranceDocs, registrationDocs };
}

export async function createCar(input: CarInput): Promise<Car> {
  const id = crypto.randomUUID();
  const timestamp = nowIso();
  const car: Car = { id, ...input, createdAt: timestamp, updatedAt: timestamp };
  await db.put({ ...keys.car(id), ...keys.carGsi(car.name), ...car });
  return car;
}

export async function updateCar(carId: string, input: CarInput): Promise<Car> {
  const existing = await getCar(carId);
  if (!existing) throw new Error("Car not found");
  const car: Car = { ...existing, ...input, updatedAt: nowIso() };
  await db.put({ ...keys.car(carId), ...keys.carGsi(car.name), ...car });
  return car;
}

export async function deleteCar(carId: string): Promise<void> {
  const rows = await db.queryByPk<{ sk: string; s3Key?: string }>(`CAR#${carId}`);
  await Promise.all(
    rows.map(async (row) => {
      if (row.s3Key) await deleteObject(row.s3Key);
      await db.delete({ pk: `CAR#${carId}`, sk: row.sk });
    })
  );
  await db.delete(keys.car(carId));
}

export async function addTireSet(carId: string, input: TireSetInput): Promise<TireSet> {
  const id = crypto.randomUUID();
  const tireSet: TireSet = { id, carId, ...input };
  await db.put({ ...keys.tireSet(carId, id), ...tireSet });
  return tireSet;
}

export async function updateTireSet(
  carId: string,
  tireSetId: string,
  input: TireSetInput
): Promise<TireSet> {
  const tireSet: TireSet = { id: tireSetId, carId, ...input };
  await db.put({ ...keys.tireSet(carId, tireSetId), ...tireSet });
  return tireSet;
}

export async function deleteTireSet(carId: string, tireSetId: string): Promise<void> {
  await db.delete(keys.tireSet(carId, tireSetId));
}

export async function addCarDoc(carId: string, input: CarDocInput): Promise<CarDoc> {
  const id = crypto.randomUUID();
  const doc: CarDoc = { id, carId, ...input, uploadedAt: nowIso() };
  await db.put({ ...keys.carDoc(carId, input.kind, id), ...doc });
  return doc;
}

export async function deleteCarDoc(carId: string, kind: string, docId: string): Promise<void> {
  const doc = await db.get<CarDoc>(keys.carDoc(carId, kind, docId));
  if (doc) await deleteObject(doc.s3Key);
  await db.delete(keys.carDoc(carId, kind, docId));
}
