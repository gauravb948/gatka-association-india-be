import { z } from "zod";

export const attendanceMarkSchema = z
  .object({
    userId: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    present: z.boolean().optional(),
    type: z.enum(["CAMP", "TC_DAILY"]),
    campId: z.string().optional(),
    trainingCenterId: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((body, ctx) => {
    if (body.type === "CAMP" && !body.campId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "campId is required for camp attendance",
        path: ["campId"],
      });
    }
    if (body.type === "TC_DAILY" && !body.trainingCenterId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "trainingCenterId is required for training center daily attendance",
        path: ["trainingCenterId"],
      });
    }
  });

const MAX_BULK = 500;

export const attendanceBulkMarkSchema = z.object({
  items: z.array(attendanceMarkSchema).min(1).max(MAX_BULK),
});

/** Query for `GET /attendance/report` — exactly one of: (trainingCenterId + date) or campId. */
export const attendanceReportQuerySchema = z
  .object({
    trainingCenterId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    campId: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const tcScope = !!(q.trainingCenterId && q.date);
    const campScope = !!q.campId;
    const count = [tcScope, campScope].filter(Boolean).length;
    if (count !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide exactly one of: trainingCenterId with date, or campId (optional date).",
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
  });
