import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import * as playerRepository from "../repositories/player.repository.js";
import * as statePaymentRepository from "../repositories/statePayment.repository.js";
import * as paymentRepository from "../repositories/payment.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../lib/errors.js";
import { getRazorpayForState } from "../lib/razorpayClient.js";
import { normalizePhoneOrEmail } from "../lib/otp.js";
import { prisma } from "../lib/prisma.js";
import {
  adminUpdatePlayerProfileSchema,
  playerDistrictBlacklistSchema,
  playerRenewalPaymentSchema,
  playerTcDisableSchema,
} from "../validators/player.validators.js";

export async function getMyProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const p = await playerRepository.findProfileWithGeo(req.dbUser!.id);
    if (!p) throw new AppError(404, "Profile not found");
    res.json(p);
  } catch (e) {
    next(e);
  }
}

/**
 * State admin (own state) or national admin: update a player's profile details.
 * Geo changes (district / training center) must remain within the player's current state.
 */
export async function updatePlayerByAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = adminUpdatePlayerProfileSchema.parse(req.body);
    const userId = req.params.userId;

    const profile = await playerRepository.findProfileWithGeo(userId);
    if (!profile) throw new AppError(404, "Player not found", "PLAYER_NOT_FOUND");

    if (actor.role === "STATE_ADMIN") {
      if (!actor.stateId || profile.stateId !== actor.stateId) {
        throw new AppError(403, "Player is not in your state", "FORBIDDEN_SCOPE");
      }
    } else if (actor.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
    }

    const nextDistrictId = body.districtId ?? profile.districtId;
    const nextTrainingCenterId = body.trainingCenterId ?? profile.trainingCenterId;

    if (body.districtId && body.districtId !== profile.districtId) {
      const district = await prisma.district.findUnique({
        where: { id: body.districtId },
        select: { id: true, stateId: true },
      });
      if (!district) throw new AppError(400, "District not found", "INVALID_DISTRICT");
      if (district.stateId !== profile.stateId) {
        throw new AppError(400, "District must belong to the player's state", "INVALID_DISTRICT");
      }
    }

    if (
      body.trainingCenterId ||
      (body.districtId && body.districtId !== profile.districtId)
    ) {
      const tc = await prisma.trainingCenter.findUnique({
        where: { id: nextTrainingCenterId },
        select: { id: true, districtId: true },
      });
      if (!tc) throw new AppError(400, "Training center not found", "INVALID_TRAINING_CENTER");
      if (tc.districtId !== nextDistrictId) {
        throw new AppError(
          400,
          "Training center must belong to the player's district",
          "INVALID_TRAINING_CENTER"
        );
      }
    }

    if (body.phone !== undefined && body.phone !== null) {
      const normalizedPhone = normalizePhoneOrEmail(body.phone);
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, phone: true },
      });
      const currentPhone = user?.phone ? normalizePhoneOrEmail(user.phone) : null;
      if (normalizedPhone !== currentPhone) {
        const takenPhone = await userRepository.findByPhone(normalizedPhone);
        if (takenPhone && takenPhone.id !== userId) {
          throw new AppError(409, "Mobile number already registered", "PHONE_IN_USE");
        }
      }
    }

    const profileData: Prisma.PlayerProfileUpdateInput = {};
    if (body.fullName !== undefined) profileData.fullName = body.fullName;
    if (body.fatherName !== undefined) profileData.fatherName = body.fatherName;
    if (body.motherName !== undefined) profileData.motherName = body.motherName;
    if (body.aadharNumber !== undefined) profileData.aadharNumber = body.aadharNumber;
    if (body.maritalStatus !== undefined) profileData.maritalStatus = body.maritalStatus;
    if (body.whatsappNo !== undefined) profileData.whatsappNo = body.whatsappNo;
    if (body.tShirtSize !== undefined) profileData.tShirtSize = body.tShirtSize;
    if (body.playingHand !== undefined) profileData.playingHand = body.playingHand;
    if (body.photoUrl !== undefined) profileData.photoUrl = body.photoUrl;
    if (body.aadharFrontUrl !== undefined) profileData.aadharFrontUrl = body.aadharFrontUrl;
    if (body.aadharBackUrl !== undefined) profileData.aadharBackUrl = body.aadharBackUrl;
    if (body.address !== undefined) profileData.address = body.address;
    if (body.gender !== undefined) profileData.gender = body.gender;
    if (body.dateOfBirth !== undefined) profileData.dateOfBirth = new Date(body.dateOfBirth);
    if (body.districtId !== undefined) {
      profileData.district = { connect: { id: body.districtId } };
    }
    if (body.trainingCenterId !== undefined) {
      profileData.trainingCenter = { connect: { id: body.trainingCenterId } };
    }

    await prisma.$transaction(async (tx) => {
      if (Object.keys(profileData).length > 0) {
        await tx.playerProfile.update({ where: { userId }, data: profileData });
      }

      const userData: Prisma.UserUpdateInput = {};
      if (body.phone !== undefined) userData.phone = body.phone;
      if (body.districtId !== undefined) userData.district = { connect: { id: body.districtId } };
      if (body.trainingCenterId !== undefined) {
        userData.trainingCenter = { connect: { id: body.trainingCenterId } };
      }
      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }
    });

    const updated = await playerRepository.findProfileWithGeo(userId);
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function renewalPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const body = playerRenewalPaymentSchema.parse(req.body);
    const profile = await playerRepository.findProfileByUserId(req.dbUser!.id);
    if (!profile) throw new AppError(404, "Profile not found");
    if (profile.stateId !== body.stateId) {
      throw new AppError(400, "State mismatch");
    }
    const cfg = await statePaymentRepository.findByStateId(body.stateId);
    if (!cfg) throw new AppError(400, "Razorpay not configured for state");
    const rz = getRazorpayForState(cfg.razorpayKeyId, cfg.razorpayKeySecret);
    const payment = await paymentRepository.createPayment({
      user: { connect: { id: req.dbUser!.id } },
      state: { connect: { id: body.stateId } },
      purpose: "PLAYER_RENEWAL",
      amountPaise: body.amountPaise,
      status: "PENDING",
    });
    const order = await rz.orders.create({
      amount: body.amountPaise,
      currency: "INR",
      receipt: payment.id.slice(0, 40),
      notes: { paymentId: payment.id, purpose: "PLAYER_RENEWAL" },
    });
    await paymentRepository.updateRazorpayOrderId(payment.id, order.id);
    res.status(201).json({
      paymentId: payment.id,
      razorpayOrderId: order.id,
      amountPaise: body.amountPaise,
      keyId: cfg.razorpayKeyId,
    });
  } catch (e) {
    next(e);
  }
}

export async function verifyDocuments(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const profile = await playerRepository.findProfileByUserId(req.params.userId);
    if (!profile) throw new AppError(404, "Player not found");
    if (profile.trainingCenterId !== u.trainingCenterId) {
      throw new AppError(403, "Player not at your TC");
    }
    const updated = await playerRepository.updateProfile(req.params.userId, {
      documentsVerifiedAt: new Date(),
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function tcDisable(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = playerTcDisableSchema.parse(req.body);
    const profile = await playerRepository.findProfileByUserId(req.params.userId);
    if (!profile) throw new AppError(404, "Player not found");
    if (profile.trainingCenterId !== u.trainingCenterId) {
      throw new AppError(403, "Forbidden");
    }
    const updated = await playerRepository.updateProfile(req.params.userId, {
      tcDisabled: body.tcDisabled,
      tcDisabledRemarks: body.tcDisabledRemarks ?? null,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function districtBlacklist(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = playerDistrictBlacklistSchema.parse(req.body);
    const profile = await playerRepository.findProfileWithDistrict(req.params.userId);
    if (!profile) throw new AppError(404, "Player not found");
    if (profile.districtId !== u.districtId) {
      throw new AppError(403, "Forbidden");
    }
    const updated = await playerRepository.updateProfile(req.params.userId, {
      isBlacklisted: body.isBlacklisted,
      blacklistRemarks: body.blacklistRemarks ?? null,
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}
