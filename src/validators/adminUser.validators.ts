import { z } from "zod";
import { EntityStatus, Role } from "@prisma/client";

function splitQueryParts(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === "") return undefined;
  const parts = (Array.isArray(raw) ? raw : [raw])
    .flatMap((s) => String(s).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Query for `GET /admin/users`: page, pageSize, optional status and userType (role). */
export const adminUserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((raw) => {
      const parts = splitQueryParts(raw);
      if (!parts) return undefined;
      const parsed = parts.map((p) => z.nativeEnum(EntityStatus).parse(p));
      return [...new Set(parsed)];
    }),
  userType: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((raw) => {
      const parts = splitQueryParts(raw);
      if (!parts) return undefined;
      const parsed = parts.map((p) => z.nativeEnum(Role).parse(p));
      return [...new Set(parsed)];
    }),
});

export const adminUserCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum([
    "STATE_ADMIN",
    "DISTRICT_ADMIN",
    "TRAINING_CENTER",
    "NATIONAL_ADMIN",
  ]),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  trainingCenterId: z.string().optional().nullable(),
  isSuperNational: z.boolean().optional(),
});
