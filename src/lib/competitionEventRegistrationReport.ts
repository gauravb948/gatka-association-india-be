import type { Gender, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { formatEventGroupLabel } from "./competitionResultList.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";

export type CompetitionEventRegistrationReportItem = {
  eventName: string;
  minPlayers: number;
  maxPlayers: number;
  playersRegistered: number;
};

export type CompetitionEventRegistrationReport = Record<
  string,
  CompetitionEventRegistrationReportItem[]
>;

export async function buildCompetitionEventRegistrationReport(
  competitionId: string,
  gender: Gender | undefined,
  playerProfileWhere: Prisma.PlayerProfileWhereInput
): Promise<CompetitionEventRegistrationReport> {
  const groups = await competitionRepository.findEventGroupsInCompetitionAgeScope(competitionId);
  if (!groups) return {};

  const filteredGroups = gender ? groups.filter((g) => g.gender === gender) : groups;
  if (filteredGroups.length === 0) return {};

  const groupIds = filteredGroups.map((g) => g.id);
  const events = await prisma.event.findMany({
    where: {
      isActive: true,
      eventGroupId: { in: groupIds },
      eventGroup: { isActive: true },
    },
    include: {
      eventGroup: { include: { ageCategory: true } },
    },
    orderBy: [{ eventGroup: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  const counts = await participationRepository.countDistinctPlayersByEvent(
    competitionId,
    events.map((e) => e.id),
    playerProfileWhere
  );

  const result: CompetitionEventRegistrationReport = {};
  for (const group of filteredGroups) {
    const label = formatEventGroupLabel(group.segment, group.gender);
    if (!result[label]) result[label] = [];
  }

  for (const event of events) {
    const label = formatEventGroupLabel(event.eventGroup.segment, event.eventGroup.gender);
    if (!result[label]) result[label] = [];
    result[label].push({
      eventName: event.name,
      minPlayers: event.minPlayers,
      maxPlayers: event.maxPlayers,
      playersRegistered: counts.get(event.id) ?? 0,
    });
  }

  return result;
}
