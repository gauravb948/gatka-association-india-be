import { z } from "zod";

export const complaintCreateSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const complaintRespondSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  response: z.string().optional(),
});
