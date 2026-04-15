import { z } from "zod";

export const smsTemplatePutBodySchema = z.object({
  template: z.string().min(1),
});
