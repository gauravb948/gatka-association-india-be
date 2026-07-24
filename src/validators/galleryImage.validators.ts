import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

export const galleryImageCreateSchema = z.object({
  imageUrl: z.string().url(),
  /** Omit or null for national CMS (national admin only). */
  stateId: optionalNullableCmsStateId,
  caption: z.string().optional(),
});

export const galleryAdminListQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export const galleryPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
