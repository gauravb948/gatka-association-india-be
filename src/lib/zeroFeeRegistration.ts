import { EntityStatus, Role } from "@prisma/client";
import * as playerRepository from "../repositories/player.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";
import { prisma } from "./prisma.js";

const ZERO_FEE_REASON = "Registration fee is ₹0; submitted for approval";

export async function isZeroRegistrationFee(role: Role): Promise<boolean> {
  const row = await prisma.rolePaymentFeeConfig.findUnique({
    where: { role },
    select: { feeAmountPaise: true },
  });
  return row != null && row.feeAmountPaise === 0;
}

function nextRegNo(prefix: string, lastValue?: string | null) {
  let next = 1;
  if (lastValue) {
    const part = lastValue.replace(prefix, "");
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(6, "0")}`;
}

async function allocatePrefixedNumber(
  model: "coachProfile" | "refereeProfile" | "trainingCenter",
  prefix: string
): Promise<string> {
  const last =
    model === "coachProfile"
      ? await prisma.coachProfile.findFirst({
          where: { registrationNumber: { startsWith: prefix } },
          orderBy: { registrationNumber: "desc" },
          select: { registrationNumber: true },
        })
      : model === "refereeProfile"
        ? await prisma.refereeProfile.findFirst({
            where: { registrationNumber: { startsWith: prefix } },
            orderBy: { registrationNumber: "desc" },
            select: { registrationNumber: true },
          })
        : await prisma.trainingCenter.findFirst({
            where: { registrationNumber: { startsWith: prefix } },
            orderBy: { registrationNumber: "desc" },
            select: { registrationNumber: true },
          });
  return nextRegNo(prefix, last?.registrationNumber);
}

/**
 * If this role's configured fee is ₹0 and the user is still PENDING,
 * move them (and linked registration records) to SUBMITTED so they skip Razorpay.
 * Returns true when a status change was applied.
 */
export async function applyZeroFeeSubmissionIfPending(userId: string, role: Role): Promise<boolean> {
  if (!(await isZeroRegistrationFee(role))) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, trainingCenterId: true },
  });
  if (!user || user.status !== EntityStatus.PENDING) return false;

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: EntityStatus.SUBMITTED,
      statusReason: ZERO_FEE_REASON,
    },
  });

  await prisma.stateRegistration.updateMany({
    where: { userId, status: EntityStatus.PENDING },
    data: { status: EntityStatus.SUBMITTED, statusReason: ZERO_FEE_REASON },
  });

  await prisma.districtRegistration.updateMany({
    where: { userId, status: EntityStatus.PENDING },
    data: { status: EntityStatus.SUBMITTED, statusReason: ZERO_FEE_REASON },
  });

  if (role === Role.TRAINING_CENTER && user.trainingCenterId) {
    const tc = await trainingCenterRepository.findByIdWithDistrictAndState(user.trainingCenterId);
    const registrationNumber =
      tc?.registrationNumber ??
      (tc?.district.state.code
        ? await allocatePrefixedNumber(
            "trainingCenter",
            `${tc.district.state.code.toUpperCase()}-TC-${new Date().getUTCFullYear()}-`
          )
        : undefined);
    await prisma.trainingCenter.updateMany({
      where: { id: user.trainingCenterId, status: EntityStatus.PENDING },
      data: {
        status: EntityStatus.SUBMITTED,
        statusReason: ZERO_FEE_REASON,
        ...(registrationNumber ? { registrationNumber } : {}),
      },
    });
  }

  if (role === Role.PLAYER) {
    const profile = await playerRepository.findProfileWithState(userId);
    if (profile && profile.registrationStatus === "PENDING_PAYMENT" && profile.state?.code) {
      const regNo =
        profile.registrationNumber ??
        (await playerRepository.allocateRegistrationNumber(profile.state.code));
      await playerRepository.updateProfile(userId, {
        registrationStatus: "ACTIVE",
        registrationNumber: regNo,
      });
    }
  }

  if (role === Role.COACH) {
    const profile = await prisma.coachProfile.findUnique({
      where: { userId },
      include: { trainingCenter: { include: { district: { include: { state: true } } } } },
    });
    const stateCode = profile?.trainingCenter.district.state.code;
    if (profile && !profile.registrationNumber && stateCode) {
      await prisma.coachProfile.update({
        where: { userId },
        data: {
          registrationNumber: await allocatePrefixedNumber(
            "coachProfile",
            `${stateCode.toUpperCase()}-CO-${new Date().getUTCFullYear()}-`
          ),
        },
      });
    }
  }

  if (role === Role.REFEREE) {
    const profile = await prisma.refereeProfile.findUnique({
      where: { userId },
      include: { state: true },
    });
    if (profile && !profile.registrationNumber && profile.state?.code) {
      await prisma.refereeProfile.update({
        where: { userId },
        data: {
          registrationNumber: await allocatePrefixedNumber(
            "refereeProfile",
            `${profile.state.code.toUpperCase()}-RF-${new Date().getUTCFullYear()}-`
          ),
        },
      });
    }
  }

  return true;
}
