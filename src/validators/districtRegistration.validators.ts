import { z } from "zod";
import { EntityStatus } from "@prisma/client";

export const districtRegistrationCreateSchema = z.object({
  stateId: z.string().min(1),
  districtId: z.string().min(1),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  userName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  mobileNo: z.string().min(10).max(15),
  address: z.string().min(1),
  passportPhotoUrl: z.string().url().nullable().optional(),
});

export const districtRegistrationStatusSchema = z.object({
  status: z.nativeEnum(EntityStatus),
  statusReason: z.string().optional(),
});

const statusQueryValue = z.union([z.string(), z.array(z.string())]).optional();

/** Query for `GET /district-registrations`: page, pageSize, optional status (comma-separated or repeated). */
export const districtRegistrationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: statusQueryValue.transform((raw) => {
    if (raw === undefined || raw === "") return undefined;
    const parts = (Array.isArray(raw) ? raw : [raw])
      .flatMap((s) => String(s).split(","))
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return undefined;
    const parsed = parts.map((p) => z.nativeEnum(EntityStatus).parse(p));
    return [...new Set(parsed)];
  }),
});
