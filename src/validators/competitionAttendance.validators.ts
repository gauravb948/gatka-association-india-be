import { z } from "zod";

export const competitionAttendanceMarkSchema = z.object({
  competitionId: z.string(),
  eventId: z.string(),
  userId: z.string(),
  present: z.boolean().optional(),
  notes: z.string().optional(),
});

const MAX_BULK = 500;

export const competitionAttendanceBulkMarkSchema = z.object({
  competitionId: z.string(),
  eventId: z.string(),
  items: z
    .array(
      z.object({
        userId: z.string(),
        present: z.boolean().optional(),
        notes: z.string().optional(),
      })
    )
    .min(1)
    .max(MAX_BULK),
});

export const competitionAttendanceReportQuerySchema = z.object({
  competitionId: z.string(),
  eventId: z.string(),
});
