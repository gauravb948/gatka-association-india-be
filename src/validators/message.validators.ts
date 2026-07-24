import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

/** Admin list — national: omit/`national` = national rows only; state admins scoped to their state. */
export const messageAdminListQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export type MessageAdminListQuery = z.infer<typeof messageAdminListQuerySchema>;

export const messageCreateSchema = z.object({
  imageUrl: z.string().url().optional(),
  name: z.string().min(1),
  message: z.string().min(1),
  designation: z.string().optional(),
  /** Omit or null for national CMS (national admin only). */
  stateId: optionalNullableCmsStateId,
});

export const messagePatchSchema = z.object({
  imageUrl: z.string().url().nullable().optional(),
  name: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  designation: z.string().nullable().optional(),
  stateId: optionalNullableCmsStateId,
});

export const messagePublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
