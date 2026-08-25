import { z } from "zod";
import { cmsStateIdInput, optionalNullableCmsStateId } from "../lib/cmsScope.js";

export const associationMemberAdminListQuerySchema = z.object({
  stateId: optionalNullableCmsStateId,
});

export const associationMemberCreateSchema = z.object({
  name: z.string().min(1).max(160),
  designation: z.string().min(1).max(160),
  mobile: z.string().max(30).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().optional(),
  stateId: optionalNullableCmsStateId,
});

export const associationMemberPatchSchema = z.object({
  name: z.string().min(1).max(160).optional(),
  designation: z.string().min(1).max(160).optional(),
  mobile: z.string().max(30).optional().nullable(),
  photoUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

export const associationMemberPublicPathStateSchema = z.object({
  stateId: cmsStateIdInput,
});
