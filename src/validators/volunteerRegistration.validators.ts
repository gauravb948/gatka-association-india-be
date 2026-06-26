import { z } from "zod";
import { Gender, MaritalStatus, VolunteerRegistrationStatus } from "@prisma/client";

export const volunteerRegistrationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  stateId: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  gender: z.nativeEnum(Gender).optional(),
  maritalStatus: z.nativeEnum(MaritalStatus).optional(),
  hasDisability: z
    .union([z.literal("true"), z.literal("false")])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  status: z.nativeEnum(VolunteerRegistrationStatus).optional(),
  search: z.string().min(1).max(120).optional(),
  createdFrom: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
  createdTo: z.string().datetime().optional().transform((v) => (v ? new Date(v) : undefined)),
});

export type VolunteerRegistrationListQuery = z.infer<typeof volunteerRegistrationListQuerySchema>;

export const volunteerRegistrationIdParamSchema = z.object({
  id: z.string().min(1),
});
