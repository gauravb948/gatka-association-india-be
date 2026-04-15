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

