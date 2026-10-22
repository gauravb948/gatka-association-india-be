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

const optionalYear = z.preprocess((v) => {
  if (v === undefined || v === null || v === "") return undefined;
  return v;
}, z.coerce.number().int().min(2000).max(2100).optional());

/** Query for `GET /results` list (dashboard table). */
export const resultListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalSearch,
  competitionId: z.string().min(1).optional(),
  level: z.enum(["NATIONAL", "STATE", "DISTRICT"]).optional(),
  session: optionalYear,
  stateId: optionalSearch,
  districtId: optionalSearch,
  ageGroup: optionalSearch,
  gender: z.enum(["MALE", "FEMALE", "OPEN"]).optional(),
  event: optionalSearch,
  certificates: z.enum(["generated", "missing"]).optional(),
});

const optionalId = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().optional());

/** Filters shared by the competition Excel exports and their preview (geography and a single event). */
export const resultExportQuerySchema = z.object({
  stateId: optionalId,
  districtId: optionalId,
  trainingCenterId: optionalId,
  /** Limit the export to one event of the competition. */
  eventId: optionalId,
});

/** Query for `GET /results/competition/:id/export-preview`. */
export const resultExportPreviewQuerySchema = resultExportQuerySchema.extend({
  kind: z.enum(["winners", "participants"]),
});
