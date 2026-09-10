import { z } from "zod";

const roleEnum = z.enum([
  "NATIONAL_ADMIN",
  "STATE_ADMIN",
  "DISTRICT_ADMIN",
  "TRAINING_CENTER",
  "COACH",
  "REFEREE",
  "PLAYER",
  "VOLUNTEER",
]);

/** Body for creating a hierarchy notice (national/state/district admins). */
export const noticeBodySchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
  targetRoles: z.array(roleEnum).min(1),
});

/** Query for paginated notice lists (`/inbox`, `/mine`). */
export const noticeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** Body for upserting the singleton national notice (national admin only). */
export const nationalNoticeBodySchema = z.object({
  title: z.string().trim().min(1),
  body: z.string().trim().min(1),
});
