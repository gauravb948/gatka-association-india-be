import { z } from "zod";

/** Query for paginated state list endpoints (`GET /states/...`). */
export const stateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createStateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(2).max(8),
  isEnabled: z.boolean().optional(),
});

export const patchStateSchema = z.object({
  name: z.string().optional(),
  isEnabled: z.boolean().optional(),
});

export const statePaymentConfigSchema = z.object({
  razorpayKeyId: z.string().min(1),
  razorpayKeySecret: z.string().min(1),
  webhookSecret: z.string().min(1),
});
