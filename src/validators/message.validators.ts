import { z } from "zod";

/** Admin list — national: optional filter; state admins always scoped to their state (`stateId` query must equal theirs when provided). */
export const messageAdminListQuerySchema = z.object({
  stateId: z.preprocess(
    (v) =>
      v === "" || v === undefined || v === null ? undefined : String(v).trim(),
    z.string().min(1).optional()
  ),
});

export type MessageAdminListQuery = z.infer<typeof messageAdminListQuerySchema>;

export const messageCreateSchema = z.object({
  imageUrl: z.string().url().optional(),
  name: z.string().min(1),
  message: z.string().min(1),
  designation: z.string().optional(),
  stateId: z.string().min(1),
});

export const messagePatchSchema = z.object({
  imageUrl: z.string().url().nullable().optional(),
  name: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  designation: z.string().nullable().optional(),
});
