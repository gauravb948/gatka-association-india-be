import type { CompetitionLevel, Gender, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { aggregateUnitTypeForLevel } from "./competitionAggregateUnits.js";
import { organisationForLevel } from "./competitionAccreditationExport.js";

export type CompetitionWinnerRow = {
  playerUserId: string;
  fullName: string;
  fatherName: string | null;
  dateOfBirth: Date;
  aadharNumber: string | null;
  /** Training Center for DISTRICT-level competitions, District for STATE, State for NATIONAL. */
  organisation: string;
  eventName: string;
  rankLabel: string;
  gender: Gender;
};

function playerUnitId(
  level: CompetitionLevel,
  profile: { trainingCenterId: string; districtId: string; stateId: string }
): string {
  if (level === "DISTRICT") return profile.trainingCenterId;
  if (level === "STATE") return profile.districtId;
  return profile.stateId;
}

/** Export uses ordinal positions (First/Second/Third) rather than the Gold/Silver/Bronze
 * labels used on printed certificates (certificateLayout.ts's rankLabelForBand). */
function positionLabel(rankBand: number): string {
  if (rankBand === 1) return "First";
  if (rankBand === 2) return "Second";
  if (rankBand === 3) return "Third";
  return "Participant";
}

function rankOrder(label: string): number {
  if (label === "First") return 0;
  if (label === "Second") return 1;
  if (label === "Third") return 2;
  return 3;
}

/**
 * Competition-wide version of the "is this player on a podium unit" check in
 * certificateRecipients.ts — computed once across all events instead of per event.
 */
export async function buildCompetitionWinnersForExport(params: {
  competitionId: string;
  level: CompetitionLevel;
  playerProfileWhere?: Prisma.PlayerProfileWhereInput;
}): Promise<CompetitionWinnerRow[]> {
  const { competitionId, level, playerProfileWhere } = params;
  const unitType = aggregateUnitTypeForLevel(level);

  const standings = await prisma.competitionAggregateStanding.findMany({
    where: { competitionId, unitType, rankBand: { in: [1, 2, 3] } },
    select: { eventId: true, unitId: true, rankBand: true },
  });
  if (standings.length === 0) return [];

  const podiumByEventUnit = new Map<string, number>();
  const eventIds = new Set<string>();
  for (const s of standings) {
    eventIds.add(s.eventId);
    const key = `${s.eventId}:${s.unitId}`;
    const prev = podiumByEventUnit.get(key);
    if (prev === undefined || s.rankBand < prev) podiumByEventUnit.set(key, s.rankBand);
  }

  const participations = await prisma.participationRecord.findMany({
    where: {
      competitionId,
      participated: true,
      eventId: { in: [...eventIds] },
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
              stateId: true,
              districtId: true,
              trainingCenterId: true,
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
  const rows: CompetitionWinnerRow[] = [];
  for (const p of participations) {
    const profile = p.playerUser.playerProfile;
    if (!profile || !p.event) continue;
    const unitId = playerUnitId(level, profile);
    const rankBand = podiumByEventUnit.get(`${p.eventId}:${unitId}`);
    if (rankBand === undefined) continue;
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
      rankLabel: positionLabel(rankBand),
      gender: profile.gender,
    });
  }

  rows.sort((a, b) => {
    const byEvent = a.eventName.localeCompare(b.eventName);
    if (byEvent !== 0) return byEvent;
    const byRank = rankOrder(a.rankLabel) - rankOrder(b.rankLabel);
    if (byRank !== 0) return byRank;
    return a.fullName.localeCompare(b.fullName);
  });

  return rows;
}
