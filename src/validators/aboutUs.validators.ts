import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

/** Public: omit / empty / `national` → national about-us; otherwise a state id. */
export const aboutUsPublicQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export type AboutUsPublicQuery = z.infer<typeof aboutUsPublicQuerySchema>;

const aboutUsFields = {
  logoUrl: z.string().url(),
  stateTitle: z.string().min(1),
  stateTitleNative: z.string().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  fbUrl: z.string().url().optional().nullable(),
  ytUrl: z.string().url().optional().nullable(),
  instaUrl: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
};

/** Create/upsert own about-us. Scope is implied by the logged-in admin (stateId ignored). */
export const aboutUsCreateBodySchema = z.object(aboutUsFields);

export const aboutUsPatchBodySchema = z.object({
  logoUrl: z.string().url().optional(),
  stateTitle: z.string().min(1).optional(),
  stateTitleNative: z.string().optional().nullable(),
  phoneNo: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  fbUrl: z.string().url().optional().nullable(),
  ytUrl: z.string().url().optional().nullable(),
  instaUrl: z.string().url().optional().nullable(),
  address: z.string().optional().nullable(),
  /** Ignored — about-us scope is fixed to the logged-in admin. */
  stateId: optionalNullableCmsStateId,
});

export const aboutUsPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
