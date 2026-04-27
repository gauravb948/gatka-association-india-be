import * as paymentRepository from "../repositories/payment.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import * as tournamentRegistrationRepository from "../repositories/tournamentRegistration.repository.js";
import * as campRepository from "../repositories/camp.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as districtRegistrationRepo from "../repositories/districtRegistration.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";
import { EntityStatus, MembershipStatus, PaymentPurpose, type Role } from "@prisma/client";
import { getMembershipBounds } from "./membership.js";
import { prisma } from "./prisma.js";

async function createMembership(
  userId: string,
  role: Role,
  paymentId: string,
  validFrom: Date,
  validUntil: Date
) {
  return prisma.membership.create({
    data: {
      userId,
      type: role,
      validFrom,
      validUntil,
      status: MembershipStatus.ACTIVE,
      paymentId,
    },
  });
}

const RENEWAL_PURPOSES: Record<string, Role> = {
  [PaymentPurpose.PLAYER_RENEWAL]: "PLAYER",
  [PaymentPurpose.COACH_RENEWAL]: "COACH",
  [PaymentPurpose.REFEREE_RENEWAL]: "REFEREE",
  [PaymentPurpose.VOLUNTEER_RENEWAL]: "VOLUNTEER",
  [PaymentPurpose.TRAINING_CENTER_RENEWAL]: "TRAINING_CENTER",
  [PaymentPurpose.STATE_MEMBERSHIP_RENEWAL]: "STATE_ADMIN",
  [PaymentPurpose.DISTRICT_MEMBERSHIP_RENEWAL]: "DISTRICT_ADMIN",
};

const REGISTRATION_TO_ROLE: Partial<Record<PaymentPurpose, Role>> = {
  [PaymentPurpose.PLAYER_REGISTRATION]: "PLAYER",
  [PaymentPurpose.COACH_REGISTRATION]: "COACH",
  [PaymentPurpose.REFEREE_REGISTRATION]: "REFEREE",
  [PaymentPurpose.VOLUNTEER_REGISTRATION]: "VOLUNTEER",
  [PaymentPurpose.TRAINING_CENTER_REGISTRATION]: "TRAINING_CENTER",
  [PaymentPurpose.STATE_REGISTRATION]: "STATE_ADMIN",
  [PaymentPurpose.DISTRICT_REGISTRATION]: "DISTRICT_ADMIN",
};

function nextRegNo(prefix: string, lastValue?: string | null) {
  let next = 1;
  if (lastValue) {
    const part = lastValue.replace(prefix, "");
    const n = parseInt(part, 10);
    if (!Number.isNaN(n)) next = n + 1;
  }
  return `${prefix}${String(next).padStart(6, "0")}`;
}

async function allocateCoachRegistrationNumber(stateCode: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `${stateCode.toUpperCase()}-CO-${year}-`;
  const last = await prisma.coachProfile.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: "desc" },
    select: { registrationNumber: true },
  });
  return nextRegNo(prefix, last?.registrationNumber);
}

async function allocateRefereeRegistrationNumber(stateCode: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `${stateCode.toUpperCase()}-RF-${year}-`;
  const last = await prisma.refereeProfile.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: "desc" },
    select: { registrationNumber: true },
  });
  return nextRegNo(prefix, last?.registrationNumber);
}

async function allocateVolunteerRegistrationNumber(stateCode: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `${stateCode.toUpperCase()}-VO-${year}-`;
  const last = await prisma.volunteerProfile.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: "desc" },
    select: { registrationNumber: true },
  });
  return nextRegNo(prefix, last?.registrationNumber);
}

async function allocateTrainingCenterRegistrationNumber(stateCode: string): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `${stateCode.toUpperCase()}-TC-${year}-`;
  const last = await prisma.trainingCenter.findFirst({
    where: { registrationNumber: { startsWith: prefix } },
    orderBy: { registrationNumber: "desc" },
    select: { registrationNumber: true },
  });
  return nextRegNo(prefix, last?.registrationNumber);
}

export async function applySuccessfulPayment(
  paymentId: string,
  razorpayPaymentId?: string
) {
  const updated = await paymentRepository.markPaidIfPending(
    paymentId,
    razorpayPaymentId
  );
  if (updated.count === 0) return;

  const pay = await paymentRepository.findById(paymentId);
  if (!pay) return;

  const { validFrom, validUntil } = await getMembershipBounds();
  const isRenewal = pay.purpose in RENEWAL_PURPOSES;

  if (isRenewal) {
    // Renewal: mark user ACCEPTED (no admin review), create new membership
    await prisma.user.updateMany({
      where: { id: pay.userId },
      data: {
        status: EntityStatus.ACCEPTED,
        statusReason: null,
        isActive: true,
        disabledReason: null,
      },
    });
  } else {
    // Registration: mark user SUBMITTED for admin approval
    await userRepository.markSubmittedIfPending(pay.userId);
  }

  // Create a membership record for registration & renewal purposes
  const role = isRenewal
    ? RENEWAL_PURPOSES[pay.purpose]
    : REGISTRATION_TO_ROLE[pay.purpose];
  if (role) {
    await createMembership(pay.userId, role, pay.id, validFrom, validUntil);
  }

  // ── Player registration ──
  if (pay.purpose === PaymentPurpose.PLAYER_REGISTRATION) {
    const profile = await playerRepository.findProfileWithState(pay.userId);
    if (profile && profile.registrationStatus === "PENDING_PAYMENT") {
      const regNo =
        profile.registrationNumber ??
        (await playerRepository.allocateRegistrationNumber(profile.state.code));
      await playerRepository.updateProfile(pay.userId, {
        registrationStatus: "ACTIVE",
        registrationNumber: regNo,
        membershipValidFrom: validFrom,
        membershipValidUntil: validUntil,
      });
    }
    return;
  }

  // ── Player renewal ──
  if (pay.purpose === PaymentPurpose.PLAYER_RENEWAL) {
    await playerRepository.updateManyByUserId(pay.userId, {
      registrationStatus: "ACTIVE",
      membershipValidFrom: validFrom,
      membershipValidUntil: validUntil,
    });
    return;
  }

  // ── Coach ──
  if (pay.purpose === PaymentPurpose.COACH_REGISTRATION || pay.purpose === PaymentPurpose.COACH_RENEWAL) {
    const profile = await prisma.coachProfile.findUnique({
      where: { userId: pay.userId },
      include: { trainingCenter: { include: { district: { include: { state: true } } } } },
    });
    const data: { membershipValidUntil: Date; registrationNumber?: string } = {
      membershipValidUntil: validUntil,
    };
    if (
      pay.purpose === PaymentPurpose.COACH_REGISTRATION &&
      profile &&
      !profile.registrationNumber
    ) {
      data.registrationNumber = await allocateCoachRegistrationNumber(
        profile.trainingCenter.district.state.code
      );
    }
    await prisma.coachProfile.updateMany({ where: { userId: pay.userId }, data });
    return;
  }

  // ── Referee ──
  if (pay.purpose === PaymentPurpose.REFEREE_REGISTRATION || pay.purpose === PaymentPurpose.REFEREE_RENEWAL) {
    const profile = await prisma.refereeProfile.findUnique({
      where: { userId: pay.userId },
      include: { state: true },
    });
    const data: { membershipValidUntil: Date; registrationNumber?: string } = {
      membershipValidUntil: validUntil,
    };
    if (
      pay.purpose === PaymentPurpose.REFEREE_REGISTRATION &&
      profile &&
      !profile.registrationNumber
    ) {
      data.registrationNumber = await allocateRefereeRegistrationNumber(profile.state.code);
    }
    await prisma.refereeProfile.updateMany({ where: { userId: pay.userId }, data });
    return;
  }

  // ── Volunteer ──
  if (
    pay.purpose === PaymentPurpose.VOLUNTEER_REGISTRATION ||
    pay.purpose === PaymentPurpose.VOLUNTEER_RENEWAL
  ) {
    const profile = await prisma.volunteerProfile.findUnique({
      where: { userId: pay.userId },
      include: { state: true },
    });
    const data: { membershipValidUntil: Date; registrationNumber?: string } = {
      membershipValidUntil: validUntil,
    };
    if (
      pay.purpose === PaymentPurpose.VOLUNTEER_REGISTRATION &&
      profile &&
      !profile.registrationNumber
    ) {
      data.registrationNumber = await allocateVolunteerRegistrationNumber(profile.state.code);
    }
    await prisma.volunteerProfile.updateMany({ where: { userId: pay.userId }, data });
    return;
  }

  // ── Training center ──
  if (
    pay.purpose === PaymentPurpose.TRAINING_CENTER_REGISTRATION ||
    pay.purpose === PaymentPurpose.TRAINING_CENTER_RENEWAL
  ) {
    const u = await prisma.user.findUnique({
      where: { id: pay.userId },
      select: { trainingCenterId: true },
    });
    if (u?.trainingCenterId) {
      const tc = await trainingCenterRepository.findByIdWithDistrictAndState(u.trainingCenterId);
      if (pay.purpose === PaymentPurpose.TRAINING_CENTER_RENEWAL) {
        if (tc) {
          await trainingCenterRepository.updateTrainingCenter(u.trainingCenterId, {
            status: EntityStatus.ACCEPTED,
            statusReason: null,
          });
        }
      } else if (tc && tc.status === EntityStatus.PENDING) {
        const registrationNumber =
          tc.registrationNumber ??
          (await allocateTrainingCenterRegistrationNumber(tc.district.state.code));
        await trainingCenterRepository.updateTrainingCenter(u.trainingCenterId, {
          status: EntityStatus.SUBMITTED,
          statusReason: "Payment completed; submitted for approval",
          registrationNumber,
        });
      }
    }
    return;
  }

  // ── Tournament ──
  if (pay.purpose === PaymentPurpose.TOURNAMENT_REGISTRATION) {
    const meta = (pay.metadata as { tournamentRegistrationId?: string }) ?? {};
    if (meta.tournamentRegistrationId) {
      await tournamentRegistrationRepository.finalizeWithPayment(
        meta.tournamentRegistrationId,
        pay.id
      );
    }
    return;
  }

  // ── Camp ──
  if (pay.purpose === PaymentPurpose.CAMP_REGISTRATION) {
    const meta = (pay.metadata as { campRegistrationId?: string }) ?? {};
    if (meta.campRegistrationId) {
      await campRepository.updateCampRegistration(meta.campRegistrationId, {
        payment: { connect: { id: pay.id } },
        status: "CONFIRMED",
      });
    }
    return;
  }

  // ── State registration ──
  if (pay.purpose === PaymentPurpose.STATE_REGISTRATION) {
    const meta = (pay.metadata as { stateRegistrationId?: string }) ?? {};
    if (meta.stateRegistrationId) {
      const reg = await stateRegistrationRepo.findById(meta.stateRegistrationId);
      if (reg && reg.status === EntityStatus.PENDING) {
        await stateRegistrationRepo.update(reg.id, {
          status: EntityStatus.SUBMITTED,
          statusReason: "Payment completed; submitted for approval",
          payment: { connect: { id: pay.id } },
        });
      }
    }
    return;
  }

  // ── State membership renewal ──
  if (pay.purpose === PaymentPurpose.STATE_MEMBERSHIP_RENEWAL) {
    const reg = await prisma.stateRegistration.findUnique({ where: { userId: pay.userId } });
    if (reg) {
      await prisma.stateRegistration.update({
        where: { id: reg.id },
        data: { status: EntityStatus.ACCEPTED, statusReason: null },
      });
    }
    return;
  }

  // ── District registration ──
  if (pay.purpose === PaymentPurpose.DISTRICT_REGISTRATION) {
    const meta = (pay.metadata as { districtRegistrationId?: string }) ?? {};
    if (meta.districtRegistrationId) {
      const reg = await districtRegistrationRepo.findById(meta.districtRegistrationId);
      if (reg && reg.status === EntityStatus.PENDING) {
        await districtRegistrationRepo.update(reg.id, {
          status: EntityStatus.SUBMITTED,
          statusReason: "Payment completed; submitted for approval",
          payment: { connect: { id: pay.id } },
        });
      }
    }
    return;
  }

  // ── District membership renewal ──
  if (pay.purpose === PaymentPurpose.DISTRICT_MEMBERSHIP_RENEWAL) {
    const reg = await prisma.districtRegistration.findUnique({ where: { userId: pay.userId } });
    if (reg) {
      await prisma.districtRegistration.update({
        where: { id: reg.id },
        data: { status: EntityStatus.ACCEPTED, statusReason: null },
      });
    }
    return;
  }
}
