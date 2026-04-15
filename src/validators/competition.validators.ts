import { z } from "zod";

export const competitionBodySchema = z.object({
  sessionId: z.string(),
  level: z.enum(["DISTRICT", "STATE", "NATIONAL"]),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  name: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]),
  ageCategoryId: z.string().optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  registrationOpensAt: z.string().datetime().optional().nullable(),
  registrationClosesAt: z.string().datetime().optional().nullable(),
  finalSubmitRequiresPayment: z.boolean().optional(),
  eventIds: z.array(z.string()).optional(),
});
