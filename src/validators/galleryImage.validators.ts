import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

export const galleryImageCreateSchema = z.object({
  imageUrl: z.string().url(),
  /** Omit or null for national CMS (national admin only). */
  stateId: optionalNullableCmsStateId,
  caption: z.string().optional(),
  category: z.string().max(120).optional().nullable(),
  categoryPa: z.string().max(120).optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const galleryImagePatchSchema = z.object({
  imageUrl: z.string().url().optional(),
  caption: z.string().optional().nullable(),
  category: z.string().max(120).optional().nullable(),
  categoryPa: z.string().max(120).optional().nullable(),
  sortOrder: z.number().int().optional(),
  stateId: optionalNullableCmsStateId,
});

export const galleryAdminListQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export const galleryPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
