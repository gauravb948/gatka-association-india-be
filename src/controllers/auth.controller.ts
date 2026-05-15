import type { Prisma } from "@prisma/client";
import { EntityStatus, Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import * as userRepository from "../repositories/user.repository.js";
import * as otpRepository from "../repositories/otp.repository.js";
import { verifyPassword, hashPassword } from "../lib/password.js";
import { signAccessToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";
import { assertHierarchyEnabled, type UserForHierarchyCheck } from "../lib/access.js";
import { withAdminRegistrationIds } from "../lib/withAdminRegistrationIds.js";
import { queueSms } from "../lib/smsQueue.js";
import { prisma } from "../lib/prisma.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as districtRepository from "../repositories/district.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";
import {
  loginSchema,
  otpConfirmSchema,
  otpRequestSchema,
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

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await userRepository.findByEmail(email);
    if (!user) throw new AppError(401, "Invalid credentials", "AUTH_FAILED");
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
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function registerCoach(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerCoachSchema.parse(req.body);
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
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function registerReferee(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerRefereeSchema.parse(req.body);
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
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function registerVolunteer(req: Request, res: Response, next: NextFunction) {
  try {
    const body = registerVolunteerSchema.parse(req.body);
    const exists = await userRepository.findByEmail(body.email);
    if (exists) throw new AppError(409, "Email already registered");

    const state = await stateRepository.findById(body.stateId);
    if (!state?.isEnabled) throw new AppError(400, "State not available");

    const passwordHash = await hashPassword(body.password);
    const userData: Prisma.UserCreateInput = {
      email: body.email,
      phone: body.phone,
      passwordHash,
      role: Role.VOLUNTEER,
      status: EntityStatus.PENDING,
      statusReason: "Pending approval",
      state: { connect: { id: body.stateId } },
      volunteerProfile: {
        create: {
          state: { connect: { id: body.stateId } },
          fullName: body.fullName,
          gender: body.gender,
        },
      },
    };
    const user = await userRepository.createPlayerWithProfile(userData);
    const payload = await buildAuthSessionForUserId(user.id);
    res.status(201).json(payload);
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
    const { phoneOrEmail } = otpRequestSchema.parse(req.body);
    const user = await userRepository.findFirstByEmailOrPhone(phoneOrEmail);
    if (!user) {
      res.json({ ok: true });
      return;
    }
    const code = String(crypto.randomInt(100000, 999999));
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await otpRepository.createOtp({
      user: { connect: { id: user.id } },
      phoneOrEmail,
      codeHash,
      purpose: "PASSWORD_RESET",
      expiresAt,
    });
    const bodyText = `Your OTP is ${code}. It expires in 10 minutes.`;
    if (user.phone) {
      await queueSms(user.phone, bodyText, user.id);
    }
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function otpConfirm(req: Request, res: Response, next: NextFunction) {
  try {
    const body = otpConfirmSchema.parse(req.body);
    const user = await userRepository.findFirstByEmailOrPhone(body.phoneOrEmail);
    if (!user) throw new AppError(400, "Invalid request");
    const otp = await otpRepository.findLatestValidPasswordReset(
      user.id,
      body.phoneOrEmail
    );
    if (!otp) throw new AppError(400, "Invalid or expired OTP");
    const match = await verifyPassword(body.code, otp.codeHash);
    if (!match) throw new AppError(400, "Invalid OTP");
    const newHash = await hashPassword(body.newPassword);
    await userRepository.completePasswordResetWithOtp(user.id, newHash, otp.id);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
