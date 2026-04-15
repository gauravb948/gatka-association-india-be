import { EntityStatus, MembershipStatus, Role } from "@prisma/client";
import { prisma } from "./prisma.js";

/**
 * Expire all memberships whose `validUntil` has passed, and cascade the
 * EXPIRED status to users, profiles, and state/district registrations.
 *
 * Designed to be called from a cron job or an admin-triggered endpoint.
 * Returns how many memberships were expired in this run.
 */
export async function expireAllMemberships(): Promise<number> {
  const now = new Date();

  const expiredMemberships = await prisma.membership.findMany({
    where: { status: MembershipStatus.ACTIVE, validUntil: { lt: now } },
    select: { id: true, userId: true, type: true },
  });

  if (expiredMemberships.length === 0) return 0;

  const membershipIds = expiredMemberships.map((m) => m.id);

  await prisma.membership.updateMany({
    where: { id: { in: membershipIds } },
    data: { status: MembershipStatus.EXPIRED },
  });

  // For each expired membership, check if the user still has any ACTIVE membership.
  // If not, mark the user and associated entities as EXPIRED.
  const userIds = [...new Set(expiredMemberships.map((m) => m.userId))];

  for (const userId of userIds) {
    const stillActive = await prisma.membership.count({
      where: { userId, status: MembershipStatus.ACTIVE },
    });
    if (stillActive > 0) continue;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, stateId: true, districtId: true, trainingCenterId: true },
    });
    if (!user) continue;

    await prisma.user.update({
      where: { id: userId },
      data: {
        status: EntityStatus.EXPIRED,
        statusReason: "Membership expired",
        isActive: false,
      },
    });

    if (user.role === Role.STATE_ADMIN) {
      await prisma.stateRegistration.updateMany({
        where: { userId, status: { not: EntityStatus.REJECTED } },
        data: { status: EntityStatus.EXPIRED, statusReason: "Membership expired" },
      });
    }

    if (user.role === Role.DISTRICT_ADMIN) {
      await prisma.districtRegistration.updateMany({
        where: { userId, status: { not: EntityStatus.REJECTED } },
        data: { status: EntityStatus.EXPIRED, statusReason: "Membership expired" },
      });
    }

    if (user.role === Role.PLAYER) {
      await prisma.playerProfile.updateMany({
        where: { userId },
        data: { registrationStatus: "EXPIRED" },
      });
    }

    if (user.role === Role.COACH) {
      await prisma.coachProfile.updateMany({
        where: { userId },
        data: { membershipValidUntil: null },
      });
    }

    if (user.role === Role.REFEREE) {
      await prisma.refereeProfile.updateMany({
        where: { userId },
        data: { membershipValidUntil: null },
      });
    }

    if (user.role === Role.VOLUNTEER) {
      await prisma.volunteerProfile.updateMany({
        where: { userId },
        data: { membershipValidUntil: null },
      });
    }

    if (user.role === Role.TRAINING_CENTER && user.trainingCenterId) {
      await prisma.trainingCenter.update({
        where: { id: user.trainingCenterId },
        data: { status: EntityStatus.EXPIRED, statusReason: "Membership expired" },
      });
    }
  }

  return expiredMemberships.length;
}
