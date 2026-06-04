import type { Gender } from "@prisma/client";
import type { ResultListContext } from "../repositories/competitionAggregateStanding.repository.js";
import { enrichByUnitType } from "../repositories/competitionAggregateStanding.repository.js";

function genderLabel(gender: Gender): string {
  if (gender === "MALE" || gender === "BOYS") return "Male";
  if (gender === "FEMALE" || gender === "GIRLS") return "Female";
  return "Open";
}

export function formatEventGroupLabel(segment: string, gender: Gender): string {
  return `${segment} (${genderLabel(gender)})`;
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
  ageGroup: string;
  eventGroup: string;
  event: string;
  gold: string | null;
  silver: string | null;
  bronze: string[];
  date: string | null;
};

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

      const first = eventStandings
        .filter((r) => r.rankBand === 1)
        .sort((a, b) => a.tieOrder - b.tieOrder);
      const second = eventStandings
        .filter((r) => r.rankBand === 2)
        .sort((a, b) => a.tieOrder - b.tieOrder);
      const third = eventStandings
        .filter((r) => r.rankBand === 3)
        .sort((a, b) => a.tieOrder - b.tieOrder);

      const unitIds = [
        ...first.map((r) => r.unitId),
        ...second.map((r) => r.unitId),
        ...third.map((r) => r.unitId),
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
        ageGroup: event.eventGroup.ageCategory.name,
        eventGroup: formatEventGroupLabel(event.eventGroup.segment, event.eventGroup.gender),
        event: event.name,
        gold: first[0] ? nameFor(first[0].unitId) : null,
        silver: second[0] ? nameFor(second[0].unitId) : null,
        bronze: third.map((r) => nameFor(r.unitId)),
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
