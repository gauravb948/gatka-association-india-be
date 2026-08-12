import { z } from "zod";
import { EntityStatus } from "@prisma/client";
import { capsString } from "../lib/storedCaps.js";

const optionalDocUrl = z.string().url().nullable().optional();

export const stateRegistrationCreateSchema = z.object({
  stateId: z.string().min(1),
  firstName: capsString(80),
  lastName: capsString(80),
  /** User resident address */
  address: z.string().min(1),
  /** User contact number */
  mobileNo: z.string().min(10).max(15),
  associationName: capsString(200),
  associationOfficeAddress: z.string().min(1),
  /** Association email id (login email for the linked User) */
  email: z.string().email(),
  associationOfficialContactNumber: z.string().min(10).max(15),
  associationRegisterNumber: z.string().min(1).max(80),
  password: z.string().min(8).max(128),
  verificationToken: z.string().min(1),
  /** User passport-size photo (re-uploadable on renewal) */
  passportPhotoUrl: optionalDocUrl,
  /** User address proof (re-uploadable on renewal) */
  addressProofUrl: optionalDocUrl,
  /** Association certificate (re-uploadable on renewal) */
  associationCertificateUrl: optionalDocUrl,
  /** Association office address proof (re-uploadable on renewal) */
  associationOfficeAddressProofUrl: optionalDocUrl,
  /** Association declaration (re-uploadable on renewal) */
  associationDeclarationUrl: optionalDocUrl,
});

export const stateRegistrationStatusSchema = z.object({
  status: z.nativeEnum(EntityStatus),
  statusReason: z.string().optional(),
});

export const stateRegistrationDecisionSchema = z.object({
  decision: z.enum(["ACCEPT", "REJECT"]),
  reason: z.string().optional(),
});

const statusQueryValue = z.union([z.string(), z.array(z.string())]).optional();

/** Query for `GET /state-registrations`: page, pageSize, optional status (comma-separated or repeated). */
export const stateRegistrationListQuerySchema = z.object({
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
