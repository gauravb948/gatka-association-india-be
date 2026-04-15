import { z } from "zod";

export const attendanceMarkSchema = z.object({
  userId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  present: z.boolean().optional(),
  type: z.enum(["TOURNAMENT", "CAMP", "TC_DAILY"]),
  competitionId: z.string().optional(),
  campId: z.string().optional(),
  trainingCenterId: z.string().optional(),
  notes: z.string().optional(),
});
