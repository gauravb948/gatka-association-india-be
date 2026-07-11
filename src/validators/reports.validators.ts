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

export const competitionScopedReportQuerySchema = z.object({
  competitionId: z.string().min(1),
  stateId: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  gender: z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]).optional(),
});

export const competitionEventRegistrationReportQuerySchema = competitionScopedReportQuerySchema;
export const competitionEventGroupParticipantsReportQuerySchema = competitionScopedReportQuerySchema;

export const competitionAgeWiseReportQuerySchema = z.object({
  competitionId: z.string().min(1),
  gender: z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]),
});
