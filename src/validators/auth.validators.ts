import { z } from "zod";
import {
  CoachAppliedFor,
  GatkaExperience,
  MaritalStatus,
  PlayingHand,
  TShirtSize,
} from "@prisma/client";

/** Physical persons only; OPEN is reserved for competition `genders`. */
const personGenderSchema = z.enum(["MALE", "FEMALE", "BOYS", "GIRLS"]);

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const registerPlayerSchema = z.object({
  fullName: z.string().min(1).max(200),
  fatherName: z.string().min(1).max(160),
  motherName: z.string().min(1).max(160),
  aadharNumber: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\s/g, "")),
  maritalStatus: z.nativeEnum(MaritalStatus),
  email: z.string().email(),
  password: z.string().min(8),
  mobileNo: z.string().min(7).max(20),
  whatsappNo: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().min(7).max(20).optional()
  ),
  address: z.string().min(3).max(1000),
  gender: personGenderSchema,
  dateOfBirth: z.string().datetime(),
  stateId: z.string().min(1),
  districtId: z.string().min(1),
  trainingCenterId: z.string().min(1),
  photoUrl: z.string().url(),
  aadharFrontUrl: z.string().url(),
  aadharBackUrl: z.string().url(),
  tShirtSize: z.nativeEnum(TShirtSize),
  playingHand: z.nativeEnum(PlayingHand),
  acceptTerms: z.literal(true),
});

export const registerCoachSchema = z.object({
  fullName: z.string().min(1).max(200),
  fatherName: z.string().min(1).max(160),
  aadharNumber: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\s/g, "")),
  address: z.string().min(3).max(1000),
  education: z.string().min(1).max(2000),
  stateId: z.string().min(1),
  districtId: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).max(20),
  appliedFor: z.nativeEnum(CoachAppliedFor),
  experienceInGatka: z.nativeEnum(GatkaExperience),
  photoUrl: z.string().url(),
  aadharFrontUrl: z.string().url(),
  aadharBackUrl: z.string().url(),
  gender: personGenderSchema,
  trainingCenterId: z.string().min(1),
  acceptTerms: z.literal(true),
});

export const registerRefereeSchema = z.object({
  fullName: z.string().min(1).max(200),
  fatherName: z.string().min(1).max(160),
  aadharNumber: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\s/g, "")),
  address: z.string().min(3).max(1000),
  education: z.string().min(1).max(2000),
  appliedFor: z.string().min(1).max(160),
  experienceInGatka: z.nativeEnum(GatkaExperience),
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).max(20),
  alternatePhone: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().min(7).max(20).optional()
  ),
  gender: personGenderSchema,
  stateId: z.string().min(1),
  districtId: z.string().min(1),
  photoUrl: z.string().url(),
  aadharFrontUrl: z.string().url(),
  aadharBackUrl: z.string().url(),
  acceptTerms: z.literal(true),
});

export const registerVolunteerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  fullName: z.string().min(1),
  gender: personGenderSchema,
  stateId: z.string(),
});

export const registerTrainingCenterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().min(7).max(20),
  name: z.string().min(1).max(160),
  address: z.string().min(3).max(1000),
  stateId: z.string().min(1),
  districtId: z.string().min(1),
  headName: z.string().min(1).max(160),
  headAadharNumber: z
    .string()
    .min(8)
    .max(20)
    .transform((s) => s.replace(/\s/g, "")),
  registrarNumber: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().min(2).max(60).optional()
  ),
  registrationCertificateUrl: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.string().url().optional()
  ),
  headPassportPhotoUrl: z.string().url(),
  headAadharFrontUrl: z.string().url(),
  headAadharBackUrl: z.string().url(),
  acceptTerms: z.literal(true),
});

export const otpRequestSchema = z.object({
  phoneOrEmail: z.string().min(3),
});

export const otpConfirmSchema = z.object({
  phoneOrEmail: z.string().min(3),
  code: z.string().min(4),
  newPassword: z.string().min(8),
});
