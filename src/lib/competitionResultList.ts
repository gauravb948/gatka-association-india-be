import type { Gender } from "@prisma/client";
import type { ResultListContext } from "../repositories/competitionAggregateStanding.repository.js";
import { enrichByUnitType } from "../repositories/competitionAggregateStanding.repository.js";
import { ageGroupLabel } from "./competitionAgeWiseReport.js";

export function genderLabel(gender: Gender): string {
  if (gender === "MALE" || gender === "BOYS") return "Male";
  if (gender === "FEMALE" || gender === "GIRLS") return "Female";
  return "Open";
}

/** Gender band of an event group: boys count as male, girls as female, everything else as open. */
export type ResultGenderBand = "MALE" | "FEMALE" | "OPEN";

export function genderBand(gender: Gender): ResultGenderBand {
  if (gender === "MALE" || gender === "BOYS") return "MALE";
  if (gender === "FEMALE" || gender === "GIRLS") return "FEMALE";
  return "OPEN";
}

export function formatEventGroupLabel(segment: string, gender: Gender): string {
  return `${segment} (${genderLabel(gender)})`;
}

export function formatEventGroupTitle(
  segment: string,
  gender: Gender,
  ageCategory: { name: string; ageTo: number | null }
): string {
  return `${formatEventGroupLabel(segment, gender)} - ${ageGroupLabel(ageCategory)}`;
}

function unitDisplayName(unitType: string, unit: unknown): string | null {
  if (!unit || typeof unit !== "object") return null;
  const name = (unit as { name?: string }).name;
  return name?.trim() ? name : null;
}

export type ResultListItem = {
  competitionId: string;
  eventId: string;
  competition: string;
  level: import("@prisma/client").CompetitionLevel;
  ageGroup: string;
  eventGroup: string;
  gender: ResultGenderBand;
  event: string;
  first: string | null;
  second: string | null;
  third: string[];
  date: string | null;
};

export type ResultListEventItem = ResultListItem & {
  winnerCertificateCount: number;
  participantCertificateCount: number;
};

export type ResultListCompetitionGroup = {
  competitionId: string;
  competition: string;
  level: ResultListItem["level"];
  eventCount: number;
  lastResultDate: string | null;
  winnerCertificateCount: number;
  participantCertificateCount: number;
  events: ResultListEventItem[];
};

/** Groups event rows by competition, keeping the incoming order of first appearance. */
export function groupResultItemsByCompetition(
  items: ResultListEventItem[]
): ResultListCompetitionGroup[] {
  const groups = new Map<string, ResultListCompetitionGroup>();
  for (const item of items) {
    let group = groups.get(item.competitionId);
    if (!group) {
      group = {
        competitionId: item.competitionId,
        competition: item.competition,
        level: item.level,
        eventCount: 0,
        lastResultDate: null,
        winnerCertificateCount: 0,
        participantCertificateCount: 0,
        events: [],
      };
      groups.set(item.competitionId, group);
    }
    group.events.push(item);
    group.eventCount += 1;
    group.winnerCertificateCount += item.winnerCertificateCount;
    group.participantCertificateCount += item.participantCertificateCount;
    if (item.date && (!group.lastResultDate || Date.parse(item.date) > Date.parse(group.lastResultDate))) {
      group.lastResultDate = item.date;
    }
  }
  return [...groups.values()];
}

export async function buildResultListItems(ctx: ResultListContext): Promise<ResultListItem[]> {
  const standingsByKey = new Map<string, ResultListContext["standings"]>();
  for (const row of ctx.standings) {
    const key = `${row.competitionId}:${row.eventId}`;
    const bucket = standingsByKey.get(key) ?? [];
    bucket.push(row);
    standingsByKey.set(key, bucket);
  }

  const unitCache = new Map<string, Map<string, unknown>>();

  const items: ResultListItem[] = [];

  for (const comp of ctx.competitions) {
    const events = ctx.eventsByCompetition.get(comp.id) ?? [];
    for (const event of events) {
      const key = `${comp.id}:${event.id}`;
      const eventStandings = standingsByKey.get(key) ?? [];
      const unitType =
        eventStandings[0]?.unitType ??
        (comp.level === "DISTRICT"
          ? "TRAINING_CENTER"
          : comp.level === "STATE"
            ? "DISTRICT"
            : "STATE");

      const firstPlace = eventStandings
        .filter((r) => r.rankBand === 1)
        .sort((a, b) => a.tieOrder - b.tieOrder);
      const secondPlace = eventStandings
        .filter((r) => r.rankBand === 2)
        .sort((a, b) => a.tieOrder - b.tieOrder);
      const thirdPlace = eventStandings
        .filter((r) => r.rankBand === 3)
        .sort((a, b) => a.tieOrder - b.tieOrder);

      const unitIds = [
        ...firstPlace.map((r) => r.unitId),
        ...secondPlace.map((r) => r.unitId),
        ...thirdPlace.map((r) => r.unitId),
      ];
      let enriched = unitCache.get(unitType);
      if (!enriched) {
        enriched = await enrichByUnitType(unitType, [...new Set(unitIds)]);
        unitCache.set(unitType, enriched);
      } else {
        const missing = [...new Set(unitIds)].filter((id) => !enriched!.has(id));
        if (missing.length) {
          const loaded = await enrichByUnitType(unitType, missing);
          for (const [id, unit] of loaded) enriched.set(id, unit);
        }
      }
      const nameFor = (unitId: string) =>
        unitDisplayName(unitType, enriched!.get(unitId)) ?? unitId;

      const latest = eventStandings.reduce<Date | null>(
        (max, r) => (max === null || r.updatedAt > max ? r.updatedAt : max),
        null
      );

      items.push({
        competitionId: comp.id,
        eventId: event.id,
        competition: comp.name,
        level: comp.level,
        ageGroup: event.eventGroup.ageCategory.name,
        eventGroup: formatEventGroupLabel(event.eventGroup.segment, event.eventGroup.gender),
        gender: genderBand(event.eventGroup.gender),
        event: event.name,
        first: firstPlace[0] ? nameFor(firstPlace[0].unitId) : null,
        second: secondPlace[0] ? nameFor(secondPlace[0].unitId) : null,
        third: thirdPlace.map((r) => nameFor(r.unitId)),
        date: latest?.toISOString() ?? null,
      });
    }
  }

  return items.sort((a, b) => {
    const aTime = a.date ? Date.parse(a.date) : 0;
    const bTime = b.date ? Date.parse(b.date) : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.competition.localeCompare(b.competition) || a.event.localeCompare(b.event);
  });
}
