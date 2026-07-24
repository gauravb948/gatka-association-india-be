import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

/**
 * Public carousel filter.
 * Omit / empty / `national` → national site banners; otherwise a state id.
 */
export const bannerPublicQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export type BannerPublicQuery = z.infer<typeof bannerPublicQuerySchema>;

/** Admin list — national: omit/`national` = national rows only; state admins scoped to their state. */
export const bannerAdminListQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export type BannerAdminListQuery = z.infer<typeof bannerAdminListQuerySchema>;

export const bannerCreateBodySchema = z.object({
  /** Omit or null for national CMS (national admin only). */
  stateId: optionalNullableCmsStateId,
  imageUrl: z.string().min(1),
  title: z.string().min(1).max(120).optional().nullable(),
  subtitle: z.string().min(1).max(220).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const bannerPatchBodySchema = z.object({
  stateId: optionalNullableCmsStateId,
  imageUrl: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional().nullable(),
  subtitle: z.string().min(1).max(220).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

/** Path param `:stateId` — allow literal `national`. */
export const bannerPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
