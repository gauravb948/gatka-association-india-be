import { z } from "zod";

/** Roles that can have a configurable national registration fee (excludes NATIONAL_ADMIN). */
export const CONFIGURABLE_FEE_ROLES = [
  "STATE_ADMIN",
  "DISTRICT_ADMIN",
  "TRAINING_CENTER",
  "COACH",
  "REFEREE",
  "PLAYER",
  "VOLUNTEER",
] as const;

export type ConfigurableFeeRole = (typeof CONFIGURABLE_FEE_ROLES)[number];

const feeRoleSchema = z.enum(CONFIGURABLE_FEE_ROLES);

export const rolePaymentFeesPatchSchema = z.object({
  fees: z
    .array(
      z.object({
        role: feeRoleSchema,
        feeAmountPaise: z.number().int().min(0),
      })
    )
    .min(1),
});
