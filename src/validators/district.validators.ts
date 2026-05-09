import { z } from "zod";

/** Query for paginated district list endpoints (`GET /districts/...`). */
export const districtListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createDistrictSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  isEnabled: z.boolean().optional(),
});

/** Body for `POST /districts` — single district; `stateId` in JSON (alternative to path-based create). */
export const createDistrictWithStateBodySchema = createDistrictSchema.extend({
  stateId: z.string().min(1),
});

/** Body for `POST /districts/state/:stateId/bulk` — add multiple districts in one transaction. */
export const bulkDistrictsCreateSchema = z.object({
  districts: z
    .array(
      z.object({
        name: z.string().min(1).max(200).transform((s) => s.trim()),
        isEnabled: z.boolean().optional(),
      })
    )
    .min(1)
    .max(100),
});

export const patchDistrictSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
  isEnabled: z.boolean().optional(),
});

/** Body for `PATCH /districts` — same fields as path-based patch plus `id` of the district. */
export const patchDistrictWithIdBodySchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
    isEnabled: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.isEnabled !== undefined, {
    message: "At least one of name or isEnabled is required",
  });

/** Body for `POST /districts/public/by-states/registration-accepted`. */
export const districtByStateIdsBodySchema = z.object({
  stateIds: z.array(z.string().min(1)).min(1),
});
