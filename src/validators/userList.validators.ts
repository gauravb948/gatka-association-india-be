import { z } from "zod";
import { EntityStatus } from "@prisma/client";

function splitQueryParts(raw: unknown): string[] | undefined {
  if (raw === undefined || raw === "") return undefined;
  const parts = (Array.isArray(raw) ? raw : [raw])
    .flatMap((s) => String(s).split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

/** Shared query for `GET /users/*` hierarchy listings. */
export const userHierarchyListQuerySchema = z.object({
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
  stateId: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  trainingCenterId: z.string().min(1).optional(),
});

export type UserHierarchyListQuery = z.infer<typeof userHierarchyListQuerySchema>;
