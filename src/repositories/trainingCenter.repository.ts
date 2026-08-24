import type { Prisma } from "@prisma/client";
import { EntityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** Public picker: enabled rows with registration `ACCEPTED` only (no pending/rejected TCs). */
export function findManyPublicByDistrict(districtId: string) {
  return prisma.trainingCenter.findMany({
    where: { districtId, isEnabled: true, status: EntityStatus.ACCEPTED },
    orderBy: { name: "asc" },
    select: { id: true, name: true, districtId: true },
  });
}

export function findManyByDistrict(districtId: string) {
  return prisma.trainingCenter.findMany({
    where: { districtId },
    orderBy: { name: "asc" },
  });
}

export function findById(id: string) {
  return prisma.trainingCenter.findUnique({ where: { id } });
}

export function findByIdWithDistrict(id: string) {
  return prisma.trainingCenter.findUnique({
    where: { id },
    include: { district: { include: { state: true } } },
  });
}

export function findByIdWithDistrictAndState(id: string) {
  return prisma.trainingCenter.findUnique({
    where: { id },
    include: { district: { include: { state: true } } },
  });
}

export function createTrainingCenter(data: Prisma.TrainingCenterCreateInput) {
  return prisma.trainingCenter.create({ data });
}

export function updateTrainingCenter(id: string, data: Prisma.TrainingCenterUpdateInput) {
  return prisma.trainingCenter.update({ where: { id }, data });
}

export type TrainingCenterDeleteCounts = {
  players: number;
  coaches: number;
  users: number;
  participations: number;
  tournamentRegistrations: number;
  attendance: number;
  results: number;
  payments: number;
  notices: number;
};

async function collectTrainingCenterUserIds(
  tx: Prisma.TransactionClient,
  trainingCenterId: string
): Promise<{ playerIds: string[]; coachIds: string[]; userIds: string[] }> {
  const [players, coaches, linkedUsers] = await Promise.all([
    tx.playerProfile.findMany({
      where: { trainingCenterId },
      select: { userId: true },
    }),
    tx.coachProfile.findMany({
      where: { trainingCenterId },
      select: { userId: true },
    }),
    tx.user.findMany({
      where: { trainingCenterId },
      select: { id: true },
    }),
  ]);
  const playerIds = players.map((p) => p.userId);
  const coachIds = coaches.map((c) => c.userId);
  const userIds = [
    ...new Set([...playerIds, ...coachIds, ...linkedUsers.map((u) => u.id)]),
  ];
  return { playerIds, coachIds, userIds };
}

/** Hard-delete a training center, its players, coaches, login users, and blocking child rows. */
export function deleteTrainingCenterWithPlayers(id: string): Promise<TrainingCenterDeleteCounts> {
  return prisma.$transaction(
    async (tx) => {
      const { playerIds, coachIds, userIds } = await collectTrainingCenterUserIds(tx, id);

      let tournamentRegistrations = 0;
      let participations = 0;
      let results = 0;
      let payments = 0;
      let users = 0;

      if (userIds.length > 0) {
        tournamentRegistrations = (
          await tx.tournamentRegistration.deleteMany({
            where: {
              OR: [{ playerUserId: { in: userIds } }, { registeredById: { in: userIds } }],
            },
          })
        ).count;
        participations = (
          await tx.participationRecord.deleteMany({
            where: { playerUserId: { in: userIds } },
          })
        ).count;
        results = (
          await tx.competitionResult.deleteMany({
            where: { playerUserId: { in: userIds } },
          })
        ).count;
        await tx.campRegistration.deleteMany({
          where: { userId: { in: userIds } },
        });
      }

      const attendance = await tx.attendance.deleteMany({
        where:
          userIds.length > 0
            ? {
                OR: [
                  { userId: { in: userIds } },
                  { markedById: { in: userIds } },
                  { trainingCenterId: id },
                ],
              }
            : { trainingCenterId: id },
      });
      const notices = await tx.notice.deleteMany({
        where:
          userIds.length > 0
            ? { OR: [{ trainingCenterId: id }, { authorId: { in: userIds } }] }
            : { trainingCenterId: id },
      });

      if (userIds.length > 0) {
        await tx.otpCode.deleteMany({ where: { userId: { in: userIds } } });
        await tx.migrationRequest.deleteMany({ where: { userId: { in: userIds } } });
        await tx.complaint.deleteMany({ where: { userId: { in: userIds } } });
        await tx.smsOutbox.deleteMany({ where: { userId: { in: userIds } } });

        const paymentRows = await tx.payment.findMany({
          where: { userId: { in: userIds } },
          select: { id: true },
        });
        const paymentIds = paymentRows.map((p) => p.id);
        if (paymentIds.length > 0) {
          await tx.stateRegistration.updateMany({
            where: { paymentId: { in: paymentIds } },
            data: { paymentId: null },
          });
          await tx.districtRegistration.updateMany({
            where: { paymentId: { in: paymentIds } },
            data: { paymentId: null },
          });
          payments = (await tx.payment.deleteMany({ where: { id: { in: paymentIds } } })).count;
        }

        users = (await tx.user.deleteMany({ where: { id: { in: userIds } } })).count;
      }

      await tx.competitionAggregateStanding.deleteMany({
        where: { unitType: "TRAINING_CENTER", unitId: id },
      });
      await tx.trainingCenter.delete({ where: { id } });

      return {
        players: playerIds.length,
        coaches: coachIds.length,
        users,
        participations,
        tournamentRegistrations,
        attendance: attendance.count,
        results,
        payments,
        notices: notices.count,
      };
    },
    { timeout: 60_000 }
  );
}
