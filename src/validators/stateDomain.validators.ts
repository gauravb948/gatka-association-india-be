import { z } from "zod";

export const stateDomainPathSchema = z.object({
  stateId: z.string().trim().min(1, "stateId is required"),
});

export const domainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "domainName is required")
  .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/+$/g, ""))
  .refine((v) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(v), {
    message: "domainName must be a valid domain",
  });

export const stateDomainPatchBodySchema = z.object({
  domainName: domainNameSchema,
});

export const stateDomainPublicQuerySchema = z.object({
  domainName: domainNameSchema,
});
