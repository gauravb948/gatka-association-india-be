import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { buildResultsListCompetitionFilter } from "./competition.repository.js";
import type { RegistrationStatSource } from "../lib/competitionRegistrationStats.js";

export async function findRegistrationsForCompetitionStatsReport(
  user: { role: import("@prisma/client").Role; stateId: string | null; districtId: string | null },
  opts?: { competitionId?: string; search?: string; finalOnly?: boolean }
): Promise<RegistrationStatSource[]> {
  const competitionWhere = buildResultsListCompetitionFilter(user, opts);
  if (competitionWhere === null) return [];

  const where: Prisma.TournamentRegistrationWhereInput = {
    competition: competitionWhere,
    playerUser: { playerProfile: { isNot: null } },
    ...(opts?.finalOnly ? { finalSubmittedAt: { not: null } } : {}),
  };

  return prisma.tournamentRegistration.findMany({
    where,
    select: {
      competitionId: true,
      playerUserId: true,
      competition: { select: { id: true, name: true, createdAt: true } },
      event: {
        select: {
          eventGroup: {
            select: {
              ageCategory: { select: { bandType: true } },
            },
          },
        },
      },
      playerUser: {
        select: {
          playerProfile: { select: { gender: true } },
        },
      },
    },
  });
}

export function upsertRegistration(args: {
  competitionId: string;
  playerUserId: string;
  eventId: string;
  registeredById: string;
}) {
  return prisma.tournamentRegistration.upsert({
    where: {
      competitionId_playerUserId_eventId: {
        competitionId: args.competitionId,
        playerUserId: args.playerUserId,
        eventId: args.eventId,
      },
    },
    create: {
      competitionId: args.competitionId,
      playerUserId: args.playerUserId,
      registeredById: args.registeredById,
      eventId: args.eventId,
    },
    update: {},
  });
}

export function findByIdWithDetails(id: string) {
  return prisma.tournamentRegistration.findUnique({
    where: { id },
    include: {
      competition: true,
      playerUser: { include: { playerProfile: true } },
    },
  });
}

export function updateFinalSubmittedNow(id: string) {
  return prisma.tournamentRegistration.update({
    where: { id },
    data: { finalSubmittedAt: new Date() },
  });
}

export function updateWithPayment(
  id: string,
  data: Prisma.TournamentRegistrationUpdateInput
) {
  return prisma.tournamentRegistration.update({ where: { id }, data });
}

export function finalizeWithPayment(registrationId: string, paymentId: string) {
  return prisma.tournamentRegistration.update({
    where: { id: registrationId },
    data: { paymentId, finalSubmittedAt: new Date() },
  });
}

export function findManyByCompetition(competitionId: string) {
  return prisma.tournamentRegistration.findMany({
    where: { competitionId },
    include: { playerUser: { select: { id: true, email: true } }, event: true },
  });
}
