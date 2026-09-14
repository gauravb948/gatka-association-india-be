import { z } from "zod";

export const migrationRequestBodySchema = z.object({
  toStateId: z.string(),
  toDistrictId: z.string().optional().nullable(),
  toTcId: z.string().optional().nullable(),
  remarks: z.string().optional(),
});

const optionalRemarks = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().max(500).optional());

export const adminMigratePlayersBodySchema = z.object({
  playerUserIds: z
    .array(z.string().min(1))
    .min(1)
    .max(100)
    .transform((ids) => [...new Set(ids.map((id) => id.trim()).filter(Boolean))])
    .refine((ids) => ids.length > 0, { message: "playerUserIds is required" }),
  toDistrictId: z.string().min(1),
  toTcId: z.string().min(1),
  remarks: optionalRemarks,
});
