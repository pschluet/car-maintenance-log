import { z } from "zod";
import { DIY_MECHANIC_ID, DOC_KINDS, QUICK_JOBS, type QuickJobId } from "./types";

const quickJobIds = QUICK_JOBS.map((j) => j.id) as [QuickJobId, ...QuickJobId[]];

export const attachmentSchema = z.object({
  s3Key: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});

export const carInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1)
    .optional(),
  color: z.string().trim().max(50).optional(),
  vin: z.string().trim().max(17).optional(),
  licensePlate: z.string().trim().max(20).optional(),
});
export type CarInput = z.infer<typeof carInputSchema>;

export const tireSetInputSchema = z.object({
  label: z.string().trim().min(1).max(50),
  frontLeftPsi: z.number().min(0).max(100).optional(),
  frontRightPsi: z.number().min(0).max(100).optional(),
  rearLeftPsi: z.number().min(0).max(100).optional(),
  rearRightPsi: z.number().min(0).max(100).optional(),
});
export type TireSetInput = z.infer<typeof tireSetInputSchema>;

export const carDocInputSchema = z.object({
  kind: z.enum(DOC_KINDS),
  s3Key: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().positive(),
});
export type CarDocInput = z.infer<typeof carDocInputSchema>;

export const entryInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be yyyy-mm-dd"),
  mileage: z.number().int().min(0).max(2_000_000),
  notes: z.string().trim().max(2000).optional().default(""),
  quickJobs: z.array(z.enum(quickJobIds)).default([]),
  mechanicId: z.string().min(1).default(DIY_MECHANIC_ID),
  attachments: z.array(attachmentSchema).default([]),
});
export type EntryInput = z.infer<typeof entryInputSchema>;

export const entryImportSchema = z.object({
  // Cap the batch so a malformed upload can't fan out into thousands of
  // writes; a household maintenance log is realistically dozens of rows.
  entries: z.array(entryInputSchema).min(1, "No entries to import").max(1000),
});
export type EntryImportInput = z.infer<typeof entryImportSchema>;

export const mechanicInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  address: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
});
export type MechanicInput = z.infer<typeof mechanicInputSchema>;

export const presignRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  carId: z.string().min(1),
  kind: z.enum(["ENTRY", ...DOC_KINDS]),
});
export type PresignRequest = z.infer<typeof presignRequestSchema>;

export const startAuthSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export const verifyAuthSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Code must be 6 digits"),
});

export const createUserInputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  isAdmin: z.boolean().default(false),
});
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
