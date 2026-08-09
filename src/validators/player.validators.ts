import { z } from "zod";
import { MaritalStatus, PlayingHand, TShirtSize } from "@prisma/client";

export const playerRenewalPaymentSchema = z.object({
  stateId: z.string(),
  amountPaise: z.number().int().positive(),
});

export const playerTcDisableSchema = z.object({
  tcDisabled: z.boolean(),
  tcDisabledRemarks: z.string().optional(),
});

export const playerDistrictBlacklistSchema = z.object({
  isBlacklisted: z.boolean(),
  blacklistRemarks: z.string().optional(),
});

const optionalTrimmed = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .transform((s) => s.trim())
    .optional();

const optionalNullableTrimmed = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .transform((s) => s.trim())
    .nullable()
    .optional();

/** State/national admin update of a player's profile (and optional account phone). */
export const adminUpdatePlayerProfileSchema = z
  .object({
    phone: z.string().min(7).max(25).nullable().optional(),
    fullName: optionalTrimmed(200),
    fatherName: optionalNullableTrimmed(160),
    motherName: optionalNullableTrimmed(160),
    aadharNumber: z
      .string()
      .min(8)
      .max(20)
      .transform((s) => s.replace(/\s/g, ""))
      .nullable()
      .optional(),
    maritalStatus: z.nativeEnum(MaritalStatus).nullable().optional(),
    whatsappNo: z.string().min(7).max(25).nullable().optional(),
    tShirtSize: z.nativeEnum(TShirtSize).nullable().optional(),
    playingHand: z.nativeEnum(PlayingHand).nullable().optional(),
    photoUrl: z.string().url().nullable().optional(),
    aadharFrontUrl: z.string().url().nullable().optional(),
    aadharBackUrl: z.string().url().nullable().optional(),
    address: z.string().min(3).max(1000).nullable().optional(),
    gender: z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]).optional(),
    dateOfBirth: z
      .string()
      .min(1)
      .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid dateOfBirth")
      .optional(),
    /** Move player within the same state. */
    districtId: z.string().min(1).optional(),
    trainingCenterId: z.string().min(1).optional(),
  })
  .strict()
  .refine((b) => Object.keys(b).length > 0, { message: "At least one field is required" });