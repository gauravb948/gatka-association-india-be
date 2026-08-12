import { z } from "zod";
import {
  CoachAppliedFor,
  GatkaExperience,
  MaritalStatus,
  PlayingHand,
  TShirtSize,
} from "@prisma/client";
import {
  optionalCapsString,
  optionalNullableCapsString,
} from "../lib/storedCaps.js";

export const playerProfileSelfSchema = z
  .object({
    fullName: optionalCapsString(200),
    fatherName: optionalNullableCapsString(160),
    motherName: optionalNullableCapsString(160),
    whatsappNo: z.string().min(7).max(25).optional(),
    address: z.string().min(3).max(1000).optional(),
    maritalStatus: z.nativeEnum(MaritalStatus).optional(),
    tShirtSize: z.nativeEnum(TShirtSize).optional(),
    playingHand: z.nativeEnum(PlayingHand).optional(),
    photoUrl: z.string().url().optional(),
    aadharFrontUrl: z.string().url().optional(),
    aadharBackUrl: z.string().url().optional(),
  })
  .strict();

export const coachProfileSelfSchema = z
  .object({
    fullName: optionalCapsString(200),
    fatherName: optionalNullableCapsString(160),
    address: z.string().min(3).max(1000).optional(),
    education: optionalCapsString(2000),
    appliedFor: z.nativeEnum(CoachAppliedFor).optional(),
    experienceInGatka: z.nativeEnum(GatkaExperience).optional(),
    photoUrl: z.string().url().optional(),
    aadharFrontUrl: z.string().url().optional(),
    aadharBackUrl: z.string().url().optional(),
  })
  .strict();

export const refereeProfileSelfSchema = z
  .object({
    fullName: optionalCapsString(200),
    fatherName: optionalNullableCapsString(160),
    alternatePhone: z.string().min(7).max(25).optional(),
    address: z.string().min(3).max(1000).optional(),
    appliedFor: optionalCapsString(160),
    education: optionalCapsString(2000),
    experienceInGatka: z.nativeEnum(GatkaExperience).optional(),
    photoUrl: z.string().url().optional(),
    aadharFrontUrl: z.string().url().optional(),
    aadharBackUrl: z.string().url().optional(),
  })
  .strict();

export const volunteerProfileSelfSchema = z
  .object({
    fullName: optionalCapsString(200),
    fatherName: optionalNullableCapsString(160),
    motherName: optionalNullableCapsString(160),
    alternatePhone: z.string().min(7).max(25).optional(),
    address: z.string().min(3).max(1000).optional(),
    maritalStatus: z.nativeEnum(MaritalStatus).optional(),
    tShirtSize: z.nativeEnum(TShirtSize).optional(),
    hasDisability: z.boolean().optional(),
    disabilityDetails: optionalNullableCapsString(1000),
    photoUrl: z.string().url().optional(),
    aadharFrontUrl: z.string().url().optional(),
    aadharBackUrl: z.string().url().optional(),
  })
  .strict();

export const trainingCenterOrgSelfSchema = z
  .object({
    name: optionalCapsString(160),
    address: z.string().min(3).max(1000).optional(),
    headName: optionalCapsString(160),
    registrarNumber: z.string().min(2).max(60).nullable().optional(),
    headAadharNumber: z
      .string()
      .min(8)
      .max(20)
      .transform((s) => s.replace(/\s/g, ""))
      .optional(),
    registrationCertificateUrl: z.string().url().nullable().optional(),
    headPassportPhotoUrl: z.string().url().optional(),
    headAadharFrontUrl: z.string().url().optional(),
    headAadharBackUrl: z.string().url().optional(),
  })
  .strict();

export const stateRegistrationSelfSchema = z
  .object({
    firstName: optionalCapsString(80),
    lastName: optionalCapsString(80),
    mobileNo: z.string().min(10).max(15).optional(),
    address: z.string().min(1).optional(),
    associationName: optionalCapsString(200),
    associationOfficeAddress: z.string().min(1).optional(),
    associationOfficialContactNumber: z.string().min(10).max(15).optional(),
    associationRegisterNumber: z.string().min(1).max(80).optional(),
    passportPhotoUrl: z.string().url().nullable().optional(),
    addressProofUrl: z.string().url().nullable().optional(),
    associationCertificateUrl: z.string().url().nullable().optional(),
    associationOfficeAddressProofUrl: z.string().url().nullable().optional(),
    associationDeclarationUrl: z.string().url().nullable().optional(),
  })
  .strict();

export const districtRegistrationSelfSchema = z
  .object({
    firstName: optionalCapsString(80),
    lastName: optionalCapsString(80),
    mobileNo: z.string().min(10).max(15).optional(),
    address: z.string().min(1).optional(),
    passportPhotoUrl: z.string().url().nullable().optional(),
  })
  .strict();

function nonEmptySection(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && Object.keys(v as object).length > 0;
}

export const patchMyProfileBodySchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(7).max(25).nullable().optional(),
    playerProfile: playerProfileSelfSchema.optional(),
    coachProfile: coachProfileSelfSchema.optional(),
    refereeProfile: refereeProfileSelfSchema.optional(),
    volunteerProfile: volunteerProfileSelfSchema.optional(),
    trainingCenterOrg: trainingCenterOrgSelfSchema.optional(),
    stateRegistration: stateRegistrationSelfSchema.optional(),
    districtRegistration: districtRegistrationSelfSchema.optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    const sections = [
      val.playerProfile,
      val.coachProfile,
      val.refereeProfile,
      val.volunteerProfile,
      val.trainingCenterOrg,
      val.stateRegistration,
      val.districtRegistration,
    ].filter(nonEmptySection);
    if (sections.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only one profile section may be updated per request",
      });
    }
    const hasAccount = val.email !== undefined || val.phone !== undefined;
    if (!hasAccount && sections.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field to update is required",
      });
    }
  });
