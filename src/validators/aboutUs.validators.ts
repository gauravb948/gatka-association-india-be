import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

/** Public: omit / empty / `national` → national about-us; otherwise a state id. */
export const aboutUsPublicQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export type AboutUsPublicQuery = z.infer<typeof aboutUsPublicQuerySchema>;

export const aboutUsAdminListQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export const aboutUsCreateBodySchema = z.object({
  /** Omit or null for national CMS (national admin only). */
  stateId: optionalNullableCmsStateId,
  logoUrl: z.string().url(),
  stateTitle: z.string().min(1),
  stateTitleNative: z.string().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  fbUrl: z.string().url().optional().nullable(),
  ytUrl: z.string().url().optional().nullable(),
  instaUrl: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const aboutUsPatchBodySchema = z.object({
  stateId: optionalNullableCmsStateId,
  logoUrl: z.string().url().optional(),
  stateTitle: z.string().min(1).optional(),
  stateTitleNative: z.string().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  fbUrl: z.string().url().optional().nullable(),
  ytUrl: z.string().url().optional().nullable(),
  instaUrl: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const aboutUsPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
