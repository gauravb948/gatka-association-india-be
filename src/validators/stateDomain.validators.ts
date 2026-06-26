import { z } from "zod";

export const stateDomainPathSchema = z.object({
  stateId: z.string().trim().min(1, "stateId is required"),
});

const domainPattern = /^[a-z0-9.-]+\.[a-z]{2,}$/;
const ipv4Pattern = /^(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])){3}$/;

export const domainNameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "domainName is required")
  .transform((v) => v.replace(/^https?:\/\//, "").replace(/\/+$/g, ""))
  .refine((v) => domainPattern.test(v) || ipv4Pattern.test(v), {
    message: "domainName must be a valid domain or IP address",
  });

export const stateDomainPatchBodySchema = z.object({
  domainName: domainNameSchema,
});

export const stateDomainPublicQuerySchema = z.object({
  domainName: domainNameSchema,
});
