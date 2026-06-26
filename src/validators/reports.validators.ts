import { z } from "zod";

const optionalSearch = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().optional());

export const competitionRegistrationsReportQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  competitionId: z.string().min(1).optional(),
});
