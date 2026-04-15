import { z } from "zod";

export const statePaymentConfigListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  stateId: z.string().min(1).optional(),
});

