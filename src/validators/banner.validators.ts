import { z } from "zod";

/** Public carousel: filter by state's id (required query on GET `/banners/public`; path variant `/banners/public/by-state/:stateId` uses the same id). */
export const bannerPublicQuerySchema = z.object({
  stateId: z.string().trim().min(1, "stateId is required"),
});

export type BannerPublicQuery = z.infer<typeof bannerPublicQuerySchema>;

/** Admin list — national: optional filter; state admins only see their state (`stateId` query must equal theirs when provided). */
export const bannerAdminListQuerySchema = z.object({
  stateId: z.preprocess(
    (v) =>
      v === "" || v === undefined || v === null ? undefined : String(v).trim(),
    z.string().min(1).optional()
  ),
});

export type BannerAdminListQuery = z.infer<typeof bannerAdminListQuerySchema>;

export const bannerCreateBodySchema = z.object({
  stateId: z.string().trim().min(1),
  imageUrl: z.string().min(1),
  title: z.string().min(1).max(120).optional().nullable(),
  subtitle: z.string().min(1).max(220).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const bannerPatchBodySchema = z.object({
  stateId: z.string().trim().min(1).optional(),
  imageUrl: z.string().min(1).optional(),
  title: z.string().min(1).max(120).optional().nullable(),
  subtitle: z.string().min(1).max(220).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
