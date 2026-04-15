import { z } from "zod";

export const noticeBodySchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  trainingCenterId: z.string().optional().nullable(),
  targetRole: z
    .enum([
      "NATIONAL_ADMIN",
      "STATE_ADMIN",
      "DISTRICT_ADMIN",
      "TRAINING_CENTER",
      "COACH",
      "REFEREE",
      "PLAYER",
      "VOLUNTEER",
    ])
    .optional()
    .nullable(),
});
