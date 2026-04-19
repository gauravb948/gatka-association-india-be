import { z } from "zod";

export const entityStatusSchema = z.enum([
  "PENDING",
  "SUBMITTED",
  "ACCEPTED",
  "REJECTED",
  "BLOCKED",
]);

export const statusChangeBodySchema = z.object({
  status: entityStatusSchema,
  statusReason: z.string().max(500).optional().nullable(),
});

export const trainingCenterStatusChangeBodySchema = z
  .object({
    status: z.enum(["ACCEPTED", "REJECTED", "BLOCKED"]),
    statusReason: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "REJECTED" || value.status === "BLOCKED") {
      if (!value.statusReason || value.statusReason.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["statusReason"],
          message: "statusReason is required for REJECTED or BLOCKED status",
        });
      }
    }
  });

