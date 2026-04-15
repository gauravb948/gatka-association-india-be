import { z } from "zod";

export const migrationRequestBodySchema = z.object({
  toStateId: z.string(),
  toDistrictId: z.string().optional().nullable(),
  toTcId: z.string().optional().nullable(),
  remarks: z.string().optional(),
});
