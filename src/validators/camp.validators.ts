import { z } from "zod";

const requiredDateString = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s.trim())), "Invalid date");

/** Roles that may be granted camp signup (excludes hierarchy admins). */
export const campSignupRoleSchema = z.enum([
  "PLAYER",
  "COACH",
  "REFEREE",
  "VOLUNTEER",
  "TRAINING_CENTER",
]);

const optionalNameSearch = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().optional());

/** Query for `GET /camps`. */
export const campsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  name: optionalNameSearch,
});

/**
 * Create camp: level is inferred from the signed-in admin (national / state / district).
 * Geography and hierarchy rules match competitions.
 */
export const campBodySchema = z
  .object({
    name: z.string().min(1),
    venue: z.string().min(1),
    stateIds: z.array(z.string().min(1)).min(1),
    districtIds: z.array(z.string().min(1)).min(1),
    startDate: requiredDateString,
    endDate: requiredDateString,
    registrationOpensAt: requiredDateString,
    registrationClosesAt: requiredDateString,
    allowedSignupRoles: z.array(campSignupRoleSchema).min(1),
  })
  .strict()
  .refine((b) => new Date(b.endDate).getTime() >= new Date(b.startDate).getTime(), {
    message: "Camp end must be on or after start",
    path: ["endDate"],
  })
  .refine(
    (b) =>
      new Date(b.registrationClosesAt).getTime() >= new Date(b.registrationOpensAt).getTime(),
    {
      message: "Registration end must be on or after registration start",
      path: ["registrationClosesAt"],
    }
  );

/** Partial update; if `stateIds` is present, `districtIds` must also be present (each non-empty). */
export const campPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    venue: z.string().min(1).optional(),
    stateIds: z.array(z.string().min(1)).optional(),
    districtIds: z.array(z.string().min(1)).optional(),
    startDate: requiredDateString.optional(),
    endDate: requiredDateString.optional(),
    registrationOpensAt: requiredDateString.optional(),
    registrationClosesAt: requiredDateString.optional(),
    allowedSignupRoles: z.array(campSignupRoleSchema).min(1).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" })
  .refine(
    (b) => {
      const hasS = b.stateIds !== undefined;
      const hasD = b.districtIds !== undefined;
      if (!hasS && !hasD) return true;
      if (hasS !== hasD) return false;
      return (b.stateIds?.length ?? 0) >= 1 && (b.districtIds?.length ?? 0) >= 1;
    },
    {
      message: "stateIds and districtIds must both be sent together, each non-empty",
      path: ["stateIds"],
    }
  )
  .superRefine((b, ctx) => {
    if (b.startDate !== undefined && b.endDate !== undefined) {
      if (new Date(b.endDate).getTime() < new Date(b.startDate).getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Camp end must be on or after start",
          path: ["endDate"],
        });
      }
    }
    if (b.registrationOpensAt !== undefined && b.registrationClosesAt !== undefined) {
      if (
        new Date(b.registrationClosesAt).getTime() <
        new Date(b.registrationOpensAt).getTime()
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Registration end must be on or after registration start",
          path: ["registrationClosesAt"],
        });
      }
    }
  });
