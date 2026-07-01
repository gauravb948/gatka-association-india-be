import type { Prisma } from "@prisma/client";
import { EntityStatus, Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import * as userRepository from "../repositories/user.repository.js";
import * as otpRepository from "../repositories/otp.repository.js";
import { verifyPassword, hashPassword } from "../lib/password.js";
import {
  signAccessToken,
  signOtpVerificationToken,
} from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";
import { assertHierarchyEnabled, type UserForHierarchyCheck } from "../lib/access.js";
import { withAdminRegistrationIds } from "../lib/withAdminRegistrationIds.js";
import {
  assertRegistrationVerificationToken,
  DEV_OTP_CODE,
  isDevOtpBypass,
  isDevelopment,
  normalizePhoneOrEmail,
  toSmsNumber,
} from "../lib/otp.js";
import { sendSmsNow } from "../lib/sms/sendSms.js";
import { prisma } from "../lib/prisma.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as districtRepository from "../repositories/district.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";
import * as volunteerRegistrationRepo from "../repositories/volunteerRegistration.repository.js";
import {
  loginSchema,
  otpConfirmSchema,
  otpRequestSchema,
  otpVerifySchema,
  registerCoachSchema,
  registerPlayerSchema,
  registerRefereeSchema,
  registerTrainingCenterSchema,
  registerVolunteerSchema,
} from "../validators/auth.validators.js";

async function buildAuthSessionForUserId(userId: string) {
  const full = await userRepository.findByIdForLoginResponse(userId);
  if (!full) throw new AppError(500, "User not found");
  return {
    accessToken: signAccessToken({ sub: full.id, role: full.role }),
    user: await withAdminRegistrationIds(full),
  };
}

function registrationOtpMessage(code: string) {
  return `Dear User your one-time password is ${code} for sign in. Regards Gatka Federation Of India.`;
}

function passwordResetOtpMessage(code: string) {
  return `Hi User, Your password reset code is ${code}. Please use this to reset your password. Regards Gatka Federation Of India`;
}

function getDltTemplateIdForPurpose(purpose: "REGISTRATION" | "PASSWORD_RESET") {
  return purpose === "REGISTRATION"
    ? process.env.MSG_DLT_TEMPLATE_REGISTRATION_ID
    : process.env.MSG_DLT_TEMPLATE_PASSWORD_RESET_ID;
}

function assertRegistrationToken(
  verificationToken: string,
  expectedIdentifiers: string[]
) {
  return assertRegistrationVerificationToken(verificationToken, expectedIdentifiers);
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError(401, "Invalid credentials", "AUTH_FAILED");
    if (user.role === Role.VOLUNTEER) {
      throw new AppError(403, "Volunteers cannot sign in", "VOLUNTEER_NO_LOGIN");
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw new AppError(401, "Invalid credentials", "AUTH_FAILED");
    const full = await userRepository.findByIdForLoginResponse(user.id);
    if (!full) throw new AppError(401, "Invalid credentials", "AUTH_FAILED");
    assertHierarchyEnabled(full as UserForHierarchyCheck);
    const token = signAccessToken({ sub: full.id, role: full.role });
    res.json({
      accessToken: token,
      user: await withAdminRegistrationIds(full),
    });
  } catch (e) {
    next(e);
  }
}

/** Get latest user details for the current token. */
export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const full = await userRepository.findByIdForLoginResponse(u.id);
    if (!full) throw new AppError(401, "User not found", "UNAUTHORIZED");
    assertHierarchyEnabled(full as UserForHierarchyCheck);
    res.json({ user: await withAdminRegistrationIds(full) });
  } catch (e) {
    next(e);
  }
}

export async function registerPlayer(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerPlayerSchema.parse(req.body);
    const registrationVerification = assertRegistrationToken(body.verificationToken, [
      body.email,
      body.mobileNo,
    ]);
    const state = await stateRepository.findById(body.stateId);
    if (!state?.isEnabled) throw new AppError(400, "State not available");
    const district = await districtRepository.findById(body.districtId);
    if (!district || district.stateId !== body.stateId || !district.isEnabled) {
      throw new AppError(400, "District not available");
    }
    const tc = await trainingCenterRepository.findById(body.trainingCenterId);
    if (!tc || tc.districtId !== body.districtId || !tc.isEnabled) {
      throw new AppError(400, "Training center not available");
    }
    const exists = await userRepository.findByEmail(body.email);
    if (exists) throw new AppError(409, "Email already registered");

    const passwordHash = await hashPassword(body.password);
    const userData: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.mobileNo,
      passwordHash,
      role: Role.PLAYER,
      status: EntityStatus.PENDING,
      statusReason: "Pending approval/payment",
      state: { connect: { id: body.stateId } },
      district: { connect: { id: body.districtId } },
      trainingCenter: { connect: { id: body.trainingCenterId } },
      playerProfile: {
        create: {
          state: { connect: { id: body.stateId } },
          district: { connect: { id: body.districtId } },
          trainingCenter: { connect: { id: body.trainingCenterId } },
          fullName: body.fullName.trim(),
          fatherName: body.fatherName.trim(),
          motherName: body.motherName.trim(),
          aadharNumber: body.aadharNumber,
          maritalStatus: body.maritalStatus,
          whatsappNo: body.whatsappNo?.trim() || null,
          tShirtSize: body.tShirtSize,
          playingHand: body.playingHand,
          address: body.address,
          photoUrl: body.photoUrl,
          aadharFrontUrl: body.aadharFrontUrl,
          aadharBackUrl: body.aadharBackUrl,
          gender: body.gender,
          dateOfBirth: new Date(body.dateOfBirth),
          registrationStatus: "PENDING_PAYMENT",
          termsAcceptedAt: new Date(),
        },
      },
    };
    const user = await userRepository.createPlayerWithProfile(userData);
    await otpRepository.markConsumed(registrationVerification.otpId);
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function registerCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerCoachSchema.parse(req.body);
    const registrationVerification = assertRegistrationToken(body.verificationToken, [
      body.email,
      body.phone,
    ]);
    const exists = await userRepository.findByEmail(body.email);
    if (exists) throw new AppError(409, "Email already registered");

    const tc = await trainingCenterRepository.findByIdWithDistrict(body.trainingCenterId);
    if (!tc || !tc.isEnabled) throw new AppError(400, "Training center not available");
    if (tc.districtId !== body.districtId || tc.district.stateId !== body.stateId) {
      throw new AppError(400, "State/district/training center mismatch");
    }

    const passwordHash = await hashPassword(body.password);
    const userData: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: Role.COACH,
      status: EntityStatus.PENDING,
      statusReason: "Pending approval",
      state: { connect: { id: tc.district.stateId } },
      district: { connect: { id: tc.districtId } },
      trainingCenter: { connect: { id: tc.id } },
      coachProfile: {
        create: {
          trainingCenter: { connect: { id: tc.id } },
          fullName: body.fullName.trim(),
          fatherName: body.fatherName.trim(),
          aadharNumber: body.aadharNumber,
          address: body.address,
          education: body.education.trim(),
          appliedFor: body.appliedFor,
          experienceInGatka: body.experienceInGatka,
          photoUrl: body.photoUrl,
          aadharFrontUrl: body.aadharFrontUrl,
          aadharBackUrl: body.aadharBackUrl,
          gender: body.gender,
          termsAcceptedAt: new Date(),
        },
      },
    };
    const user = await userRepository.createPlayerWithProfile(userData);
    await otpRepository.markConsumed(registrationVerification.otpId);
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function registerReferee(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerRefereeSchema.parse(req.body);
    const registrationVerification = assertRegistrationToken(body.verificationToken, [
      body.email,
      body.phone,
    ]);
    const exists = await userRepository.findByEmail(body.email);
    if (exists) throw new AppError(409, "Email already registered");

    const state = await stateRepository.findById(body.stateId);
    if (!state?.isEnabled) throw new AppError(400, "State not available");
    const district = await districtRepository.findById(body.districtId);
    if (!district || district.stateId !== body.stateId || !district.isEnabled) {
      throw new AppError(400, "District not available");
    }

    const passwordHash = await hashPassword(body.password);
    const userData: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: Role.REFEREE,
      status: EntityStatus.PENDING,
      statusReason: "Pending approval",
      state: { connect: { id: body.stateId } },
      district: { connect: { id: body.districtId } },
      refereeProfile: {
        create: {
          state: { connect: { id: body.stateId } },
          district: { connect: { id: body.districtId } },
          fullName: body.fullName.trim(),
          fatherName: body.fatherName.trim(),
          aadharNumber: body.aadharNumber,
          alternatePhone: body.alternatePhone ?? null,
          address: body.address,
          appliedFor: body.appliedFor.trim(),
          education: body.education.trim(),
          experienceInGatka: body.experienceInGatka,
          photoUrl: body.photoUrl,
          aadharFrontUrl: body.aadharFrontUrl,
          aadharBackUrl: body.aadharBackUrl,
          gender: body.gender,
          termsAcceptedAt: new Date(),
        },
      },
    };
    const user = await userRepository.createPlayerWithProfile(userData);
    await otpRepository.markConsumed(registrationVerification.otpId);
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function registerVolunteer(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerVolunteerSchema.parse(req.body);
    const registrationVerification = assertRegistrationToken(body.verificationToken, [
      body.email,
      body.phone,
    ]);
    const existingUser = await userRepository.findByEmail(body.email);
    if (existingUser) throw new AppError(409, "Email already registered");
    const existingVolunteer = await volunteerRegistrationRepo.findByEmail(body.email);
    if (existingVolunteer) throw new AppError(409, "Email already registered");

    const state = await stateRepository.findById(body.stateId);
    if (!state?.isEnabled) throw new AppError(400, "State not available");
    const district = await districtRepository.findById(body.districtId);
    if (!district || district.stateId !== body.stateId || !district.isEnabled) {
      throw new AppError(400, "District not available");
    }

    const row = await volunteerRegistrationRepo.create({
      state: { connect: { id: body.stateId } },
      district: { connect: { id: body.districtId } },
      fullName: body.fullName.trim(),
      fatherName: body.fatherName.trim(),
      motherName: body.motherName.trim(),
      aadharNumber: body.aadharNumber,
      maritalStatus: body.maritalStatus,
      email: body.email,
      phone: body.phone,
      alternatePhone: body.alternatePhone?.trim() || null,
      address: body.address,
      dateOfBirth: new Date(body.dateOfBirth),
      tShirtSize: body.tShirtSize,
      hasDisability: body.hasDisability,
      disabilityDetails: body.hasDisability ? body.disabilityDetails?.trim() ?? null : null,
      photoUrl: body.photoUrl,
      aadharFrontUrl: body.aadharFrontUrl,
      aadharBackUrl: body.aadharBackUrl,
      gender: body.gender,
      termsAcceptedAt: new Date(),
    });
    await otpRepository.markConsumed(registrationVerification.otpId);
    res.status(201).json({
      id: row.id,
      status: row.status,
      fullName: row.fullName,
      email: row.email,
      stateId: row.stateId,
      districtId: row.districtId,
      createdAt: row.createdAt,
    });
  } catch (e) {
    next(e);
  }
}

export async function registerTrainingCenter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = registerTrainingCenterSchema.parse(req.body);
    const registrationVerification = assertRegistrationToken(body.verificationToken, [
      body.email,
      body.phone,
    ]);
    const exists = await userRepository.findByEmail(body.email);
    if (exists) throw new AppError(409, "Email already registered");

    const district = await districtRepository.findByIdWithState(body.districtId);
    if (!district || !district.isEnabled || !district.state.isEnabled) {
      throw new AppError(400, "District not available");
    }
    if (district.stateId !== body.stateId) {
      throw new AppError(400, "State/district mismatch");
    }

    const tc = await trainingCenterRepository.createTrainingCenter({
      district: { connect: { id: district.id } },
      name: body.name.trim(),
      address: body.address,
      registrarNumber: body.registrarNumber ?? null,
      headName: body.headName.trim(),
      headAadharNumber: body.headAadharNumber,
      registrationCertificateUrl: body.registrationCertificateUrl ?? null,
      headPassportPhotoUrl: body.headPassportPhotoUrl,
      headAadharFrontUrl: body.headAadharFrontUrl,
      headAadharBackUrl: body.headAadharBackUrl,
      isEnabled: false,
      status: EntityStatus.PENDING,
      statusReason: "Pending approval",
      termsAcceptedAt: new Date(),
    });

    const passwordHash = await hashPassword(body.password);
    const userData: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: Role.TRAINING_CENTER,
      status: EntityStatus.PENDING,
      statusReason: "Pending approval",
      state: { connect: { id: district.stateId } },
      district: { connect: { id: district.id } },
      trainingCenter: { connect: { id: tc.id } },
    };
    const user = await userRepository.createPlayerWithProfile(userData);
    await otpRepository.markConsumed(registrationVerification.otpId);
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json({
      ...payload,
      trainingCenterId: tc.id,
    });
  } catch (e) {
    next(e);
  }
}

export async function otpRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const { phoneOrEmail, purpose } = otpRequestSchema.parse(req.body);
    const normalizedIdentifier = normalizePhoneOrEmail(phoneOrEmail);
    let userId: string | null = null;
    let recipientPhone: string | null = null;

    if (purpose === "REGISTRATION") {
      const existing = await userRepository.findFirstByEmailOrPhone(normalizedIdentifier);
      if (existing) {
        // Anti-enumeration: behave as success for already-registered identifiers.
        res.json({ ok: true });
        return;
      }
      recipientPhone = toSmsNumber(normalizedIdentifier);
    } else {
      const user = await userRepository.findFirstByEmailOrPhone(normalizedIdentifier);
      if (!user) {
        res.json({ ok: true });
        return;
      }
      if (!user.phone) {
        // Preserve anti-enumeration semantics; account exists but has no SMS destination.
        res.json({ ok: true });
        return;
      }
      userId = user.id;
      recipientPhone = toSmsNumber(user.phone);
    }

    const code = isDevelopment() ? DEV_OTP_CODE : String(crypto.randomInt(100000, 999999));
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await otpRepository.createOtp({
      ...(userId ? { user: { connect: { id: userId } } } : {}),
      phoneOrEmail: normalizedIdentifier,
      codeHash,
      purpose,
      expiresAt,
    });

    if (!isDevelopment()) {
      const bodyText =
        purpose === "REGISTRATION"
          ? registrationOtpMessage(code)
          : passwordResetOtpMessage(code);
      await sendSmsNow({
        phone: recipientPhone,
        body: bodyText,
        userId: userId ?? undefined,
        templateId: getDltTemplateIdForPurpose(purpose),
      });
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function otpVerify(req: Request, res: Response, next: NextFunction) {
  try {
    const body = otpVerifySchema.parse(req.body);
    const normalizedIdentifier = normalizePhoneOrEmail(body.phoneOrEmail);

    const userIdForPurpose =
      body.purpose === "PASSWORD_RESET"
        ? (await userRepository.findFirstByEmailOrPhone(normalizedIdentifier))?.id ?? null
        : null;

    if (body.purpose === "PASSWORD_RESET" && !userIdForPurpose) {
      throw new AppError(400, "Invalid request");
    }

    let otp = await otpRepository.findLatestValidByPurpose({
      phoneOrEmail: normalizedIdentifier,
      purpose: body.purpose,
      userId: userIdForPurpose,
    });

    if (!otp && isDevOtpBypass(body.code)) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      otp = await otpRepository.createOtp({
        ...(userIdForPurpose ? { user: { connect: { id: userIdForPurpose } } } : {}),
        phoneOrEmail: normalizedIdentifier,
        codeHash: await hashPassword(DEV_OTP_CODE),
        purpose: body.purpose,
        expiresAt,
      });
    }
    if (!otp) throw new AppError(400, "Invalid or expired OTP");

    const match =
      isDevOtpBypass(body.code) || (await verifyPassword(body.code, otp.codeHash));
    if (!match) throw new AppError(400, "Invalid OTP");

    const verificationToken = signOtpVerificationToken({
      phoneOrEmail: normalizedIdentifier,
      purpose: body.purpose,
      otpId: otp.id,
      typ: "OTP_VERIFICATION",
    });

    res.json({ verificationToken });
  } catch (e) {
    next(e);
  }
}

export async function otpConfirm(req: Request, res: Response, next: NextFunction) {
  try {
    const body = otpConfirmSchema.parse(req.body);
    const normalizedIdentifier = normalizePhoneOrEmail(body.phoneOrEmail);
    const user = await userRepository.findFirstByEmailOrPhone(normalizedIdentifier);
    if (!user) throw new AppError(400, "Invalid request");
    let otp = await otpRepository.findLatestValidByPurpose({
      userId: user.id,
      phoneOrEmail: normalizedIdentifier,
      purpose: "PASSWORD_RESET",
    });

    if (!otp && isDevOtpBypass(body.code)) {
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      otp = await otpRepository.createOtp({
        user: { connect: { id: user.id } },
        phoneOrEmail: normalizedIdentifier,
        codeHash: await hashPassword(DEV_OTP_CODE),
        purpose: "PASSWORD_RESET",
        expiresAt,
      });
    }
    if (!otp) throw new AppError(400, "Invalid or expired OTP");

    const match =
      isDevOtpBypass(body.code) || (await verifyPassword(body.code, otp.codeHash));
    if (!match) throw new AppError(400, "Invalid OTP");
    const newHash = await hashPassword(body.newPassword);
    await userRepository.completePasswordResetWithOtp(user.id, newHash, otp.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
