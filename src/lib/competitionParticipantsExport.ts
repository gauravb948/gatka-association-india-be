import type { CompetitionLevel, Gender, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { organisationForLevel } from "./competitionAccreditationExport.js";

export type CompetitionParticipantRow = {
  playerUserId: string;
  fullName: string;
  fatherName: string | null;
  dateOfBirth: Date;
  aadharNumber: string | null;
  /** Training Center for DISTRICT-level competitions, District for STATE, State for NATIONAL. */
  organisation: string;
  eventName: string;
  gender: Gender;
};

/**
 * Every (player, event) participation row for a competition — unlike
 * competitionWinnersExport.ts this has no podium/standings filter, so it includes
 * everyone who took part, not just medal winners.
 */
export async function buildCompetitionParticipantsForExport(params: {
  competitionId: string;
  level: CompetitionLevel;
  playerProfileWhere?: Prisma.PlayerProfileWhereInput;
}): Promise<CompetitionParticipantRow[]> {
  const { competitionId, level, playerProfileWhere } = params;

  const participations = await prisma.participationRecord.findMany({
    where: {
      competitionId,
      participated: true,
      ...(playerProfileWhere && Object.keys(playerProfileWhere).length > 0
        ? { playerUser: { playerProfile: playerProfileWhere } }
        : {}),
    },
    select: {
      playerUserId: true,
      eventId: true,
      event: { select: { name: true } },
      playerUser: {
        select: {
          playerProfile: {
            select: {
              fullName: true,
              fatherName: true,
              dateOfBirth: true,
              aadharNumber: true,
              gender: true,
              state: { select: { name: true } },
              district: { select: { name: true } },
              trainingCenter: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const seen = new Set<string>();
  const rows: CompetitionParticipantRow[] = [];
  for (const p of participations) {
    const profile = p.playerUser.playerProfile;
    if (!profile || !p.event) continue;
    const key = `${p.playerUserId}:${p.eventId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      playerUserId: p.playerUserId,
      fullName: profile.fullName,
      fatherName: profile.fatherName,
      dateOfBirth: profile.dateOfBirth,
      aadharNumber: profile.aadharNumber,
      organisation: organisationForLevel(level, profile),
      eventName: p.event.name,
      gender: profile.gender,
    });
  }

  rows.sort((a, b) => {
    const byEvent = a.eventName.localeCompare(b.eventName);
    if (byEvent !== 0) return byEvent;
    return a.fullName.localeCompare(b.fullName);
  });

  return rows;
}
