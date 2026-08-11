import { z } from "zod";

const optionalNameSearch = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().optional());

/** Query for `GET /competitions` (optional filters). */
export const competitionsListQuerySchema = z.object({
  name: optionalNameSearch,
});

/** Query for `GET /competitions/me`. `session` = UTC calendar year of `createdAt` (competition season). */
export const competitionsMeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  name: optionalNameSearch,
  session: z.coerce.number().int().min(2000).max(2100).optional(),
});

/**
 * Query for `GET /competitions/me/for-reports` — report filter dropdowns.
 * Uses pre–lower-hierarchy visibility (no session year filter).
 */
export const competitionsForReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  name: optionalNameSearch,
});

/** Body for `POST /competitions/:id/participations` — catalog `Event.id`; multiple ids for team events. */
export const competitionParticipationBodySchema = z.object({
  eventId: z.string().min(1),
  playerUserIds: z.array(z.string().min(1)).min(1).max(32),
});

/** Body for `DELETE /competitions/:id/participations` — unregister a player (all events, or one if `eventId` set). */
export const competitionUnregisterParticipationBodySchema = z.object({
  playerUserId: z.string().min(1),
  eventId: z.string().min(1).optional(),
});

/** Body for `POST /competitions/:id/participations/replace` — swap one team (or event) player for another. */
export const competitionReplaceParticipationBodySchema = z.object({
  eventId: z.string().min(1),
  removePlayerUserId: z.string().min(1),
  addPlayerUserId: z.string().min(1),
});

/** Body for `POST /competitions/:id/participations/bulk` — multiple event signups in one request. */
export const competitionParticipationBulkBodySchema = z.object({
  items: z.array(competitionParticipationBodySchema).min(1).max(30),
});

const optionalEventId = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}, z.string().min(1).optional());

/** Query for paginated competition participation lists (`eventId` scopes registered rows to one catalog event). */
export const competitionParticipationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  search: optionalNameSearch,
  eventId: optionalEventId,
});

const requiredDateString = z
  .string()
  .min(1)
  .refine((s) => !Number.isNaN(Date.parse(s.trim())), "Invalid date");

const genderValue = z.enum(["MALE", "FEMALE", "BOYS", "GIRLS", "OPEN"]);

/**
 * Save competition (admin form): name, venue, genders, states, districts, dates, age-as-of date.
 * `level` is inferred from admin role. Competition season year is inferred from `createdAt` (UTC).
 */
export const competitionBodySchema = z.object({
  name: z.string().min(1),
  venue: z.string().min(1),
  genders: z.array(genderValue).min(1),
  stateIds: z.array(z.string().min(1)).min(1),
  districtIds: z.array(z.string().min(1)).min(1),
  startDate: requiredDateString,
  endDate: requiredDateString,
  registrationOpensAt: requiredDateString,
  registrationClosesAt: requiredDateString,
  ageTillDate: requiredDateString,
  ageCategoryIds: z.array(z.string().min(1)).min(1),
});

/** Partial update; if `stateIds` is present, `districtIds` must also be present (and vice versa), each with at least one id. */
export const competitionPatchSchema = z
  .object({
    name: z.string().min(1).optional(),
    venue: z.string().min(1).optional(),
    genders: z.array(genderValue).min(1).optional(),
    stateIds: z.array(z.string().min(1)).optional(),
    districtIds: z.array(z.string().min(1)).optional(),
    startDate: requiredDateString.optional(),
    endDate: requiredDateString.optional(),
    registrationOpensAt: requiredDateString.optional(),
    registrationClosesAt: requiredDateString.optional(),
    ageTillDate: requiredDateString.optional(),
    ageCategoryIds: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" })
  .refine(
    (b) => {
      const hasS = b.stateIds !== undefined;
      const hasD = b.districtIds !== undefined;
      if (!hasS && !hasD) return true;
      if (hasS !== hasD) return false;
      return (b.stateIds?.length ?? 0) >= 1 && (b.districtIds?.length ?? 0) >= 1;
    },
    {
      message: "stateIds and districtIds must both be sent together, each non-empty",
      path: ["stateIds"],
    }
  );
