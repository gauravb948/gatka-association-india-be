import { z } from "zod";

export const competitionResultBodySchema = z.object({
  competitionId: z.string(),
  eventId: z.string(),
  playerUserId: z.string(),
  rank: z.number().int().optional().nullable(),
  score: z.string().optional().nullable(),
});

const optionalSearch = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().optional());

/** Query for `GET /results` list (dashboard table). */
export const resultListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  competitionId: z.string().min(1).optional(),
});
