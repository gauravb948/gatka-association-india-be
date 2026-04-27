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

const MAX_BULK = 500;

export const attendanceBulkMarkSchema = z.object({
  items: z.array(attendanceMarkSchema).min(1).max(MAX_BULK),
});

/** Query for `GET /attendance/report` — exactly one of: (trainingCenterId + date), competitionId, or campId. */
export const attendanceReportQuerySchema = z
  .object({
    trainingCenterId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    competitionId: z.string().optional(),
    eventId: z.string().optional(),
    campId: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const tcScope = !!(q.trainingCenterId && q.date);
    const compScope = !!q.competitionId;
    const campScope = !!q.campId;
    const count = [tcScope, compScope, campScope].filter(Boolean).length;
    if (count !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one of: trainingCenterId with date, competitionId (optional eventId, optional date), or campId (optional date).",
        path: ["trainingCenterId"],
      });
    }
    if (q.trainingCenterId && !q.date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "date (YYYY-MM-DD) is required with trainingCenterId",
        path: ["date"],
      });
    }
    if (q.eventId && !q.competitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "competitionId is required with eventId",
        path: ["competitionId"],
      });
    }
  });
