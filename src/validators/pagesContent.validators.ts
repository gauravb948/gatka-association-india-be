import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

export const cmsPageSlugSchema = z.enum([
  "HISTORY_OF_GATKA",
  "HISTORY_OF_ASSOCIATION",
  "DRESS_CODE",
  "TYPES_OF_TOURNAMENTS",
  "OUR_ACHIEVEMENTS",
]);

export const pagesContentAdminQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
  page: cmsPageSlugSchema,
});

export const pagesContentPublicQuerySchema = z.object({
  page: cmsPageSlugSchema,
});

export const pagesContentPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});

export const pagesContentUpsertSchema = z.object({
  page: cmsPageSlugSchema,
  title: z.string().min(1).max(200),
  detailedDescription: z.string().min(1),
  isEnabled: z.boolean().optional(),
  /** Omit or null for national CMS (national admin only). */
  stateId: optionalNullableCmsStateId,
});

export const pagesContentPatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  detailedDescription: z.string().min(1).optional(),
  isEnabled: z.boolean().optional(),
});
