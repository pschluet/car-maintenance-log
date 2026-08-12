export const DOC_KINDS = ["PHOTO", "INSURANCE", "REGISTRATION"] as const;
export type DocKind = (typeof DOC_KINDS)[number];

export const QUICK_JOBS = [
  { id: "oil-change", label: "Oil change" },
  { id: "cabin-air-filter", label: "Cabin air filter" },
  { id: "engine-air-filter", label: "Engine air filter" },
  { id: "tire-rotation", label: "Tire rotation" },
] as const;
export type QuickJobId = (typeof QUICK_JOBS)[number]["id"];

export const DIY_MECHANIC_ID = "diy";

export interface Attachment {
  s3Key: string;
  fileName: string;
  contentType: string;
  size: number;
}

/** What the shared thumb/viewer components need — both `Attachment` and
 * `CarDoc` satisfy this structurally, so either can be passed directly. */
export type AttachmentLike = Pick<Attachment, "s3Key" | "fileName" | "contentType">;

export interface CarDoc {
  id: string;
  carId: string;
  kind: DocKind;
  s3Key: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: string;
}

export interface TireSet {
  id: string;
  carId: string;
  label: string; // e.g. "Summer", "Winter/Snow"
  frontLeftPsi?: number;
  frontRightPsi?: number;
  rearLeftPsi?: number;
  rearRightPsi?: number;
}

export interface Car {
  id: string;
  name: string;
  year?: number;
  color?: string;
  vin?: string;
  licensePlate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CarWithDetails extends Car {
  tireSets: TireSet[];
  photos: CarDoc[];
  insuranceDocs: CarDoc[];
  registrationDocs: CarDoc[];
}

export interface MaintenanceEntry {
  id: string;
  carId: string;
  date: string; // yyyy-mm-dd
  mileage: number;
  notes: string;
  quickJobs: QuickJobId[];
  mechanicId: string; // DIY_MECHANIC_ID when self-performed
  attachments: Attachment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Mechanic {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
}

export interface AppUser {
  sub: string;
  email: string;
  isAdmin: boolean;
}
