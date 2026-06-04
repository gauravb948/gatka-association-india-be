import { z } from "zod";

/** Public: filter by state's id (query on `GET /about-us/public`). */
export const aboutUsPublicQuerySchema = z.object({
  stateId: z.string().trim().min(1, "stateId is required"),
});

export type AboutUsPublicQuery = z.infer<typeof aboutUsPublicQuerySchema>;

/** Admin list — national: optional filter; state admins always scoped to their state. */
export const aboutUsAdminListQuerySchema = z.object({
  stateId: z.preprocess(
    (v) =>
      v === "" || v === undefined || v === null ? undefined : String(v).trim(),
    z.string().min(1).optional()
  ),
});

export const aboutUsCreateBodySchema = z.object({
  stateId: z.string().trim().min(1),
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
  stateId: z.string().trim().min(1).optional(),
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
