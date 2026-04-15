import { z } from "zod";

export const patchAgeCalculationDateSchema = z.object({
  ageCalculationDate: z.string().datetime().nullable(),
});

export const patchMembershipExpiryDateSchema = z.object({
  membershipExpiryDate: z.string().datetime().nullable(),
});
