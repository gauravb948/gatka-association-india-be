import { z } from "zod";

/** Query for paginated district list endpoints (`GET /districts/...`). */
export const districtListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createDistrictSchema = z.object({
  name: z.string().min(1),
  isEnabled: z.boolean().optional(),
});

export const patchDistrictSchema = z.object({
  name: z.string().optional(),
  isEnabled: z.boolean().optional(),
});
