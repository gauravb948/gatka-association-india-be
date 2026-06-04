import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  buildResultsListCompetitionFilter,
  findEventGroupsInCompetitionAgeScope,
} from "./competition.repository.js";

export async function replaceForCompetitionEvent(
  competitionId: string,
  eventId: string,
  rows: {
    rankBand: number;
    unitType: string;
    unitId: string;
    tieOrder: number;
    createdById: string | null;
  }[]
) {
  return prisma.$transaction(async (tx) => {
    await tx.competitionAggregateStanding.deleteMany({
      where: { competitionId, eventId },
    });
    for (const r of rows) {
      await tx.competitionAggregateStanding.create({
        data: {
          competitionId,
          eventId,
          rankBand: r.rankBand,
          unitType: r.unitType,
          unitId: r.unitId,
          tieOrder: r.tieOrder,
          createdById: r.createdById,
        },
      });
    }
    return tx.competitionAggregateStanding.findMany({
      where: { competitionId, eventId },
      orderBy: [{ rankBand: "asc" }, { tieOrder: "asc" }],
    });
  });
}

const standingInclude = {
  event: {
    include: {
      eventGroup: { include: { ageCategory: true } },
    },
  },
  createdBy: { select: { id: true, email: true, role: true } },
} satisfies Prisma.CompetitionAggregateStandingInclude;

export function findManyByCompetition(competitionId: string) {
  return prisma.competitionAggregateStanding.findMany({
    where: { competitionId },
    orderBy: [{ eventId: "asc" }, { rankBand: "asc" }, { tieOrder: "asc" }],
    include: standingInclude,
  });
}

const unitEnricher = {
  async TRAINING_CENTER(ids: string[]) {
    if (ids.length === 0) return new Map();
    const rows = await prisma.trainingCenter.findMany({
      where: { id: { in: ids } },
      include: {
        district: {
          select: {
            id: true,
            name: true,
            state: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });
    return new Map(rows.map((r) => [r.id, r]));
  },
  async DISTRICT(ids: string[]) {
    if (ids.length === 0) return new Map();
    const rows = await prisma.district.findMany({
      where: { id: { in: ids } },
      include: { state: { select: { id: true, name: true, code: true } } },
    });
    return new Map(rows.map((r) => [r.id, r]));
  },
  async STATE(ids: string[]) {
    if (ids.length === 0) return new Map();
    const rows = await prisma.state.findMany({ where: { id: { in: ids } } });
    return new Map(rows.map((r) => [r.id, r]));
  },
} satisfies Record<string, (ids: string[]) => Promise<Map<string, unknown>>>;

export async function enrichByUnitType(unitType: string, ids: string[]) {
  const fn = unitEnricher[unitType as keyof typeof unitEnricher];
  if (!fn) return new Map();
  return fn(ids);
}

export type AggregateStandingRow = Prisma.CompetitionAggregateStandingGetPayload<{
  include: typeof standingInclude;
}>;

export type ResultListContext = {
  competitions: { id: string; name: string; level: import("@prisma/client").CompetitionLevel }[];
  eventsByCompetition: Map<
    string,
    Prisma.EventGetPayload<{
      include: { eventGroup: { include: { ageCategory: true } } };
    }>[]
  >;
  standings: AggregateStandingRow[];
};

export async function findResultListContext(
  user: { role: import("@prisma/client").Role; stateId: string | null; districtId: string | null },
  opts?: { competitionId?: string; search?: string }
): Promise<ResultListContext> {
  const competitionWhere = buildResultsListCompetitionFilter(user, opts);
  if (competitionWhere === null) {
    return { competitions: [], eventsByCompetition: new Map(), standings: [] };
  }

  const competitionIds = (
    await prisma.competitionAggregateStanding.findMany({
      where: { competition: competitionWhere },
      select: { competitionId: true },
      distinct: ["competitionId"],
    })
  ).map((r) => r.competitionId);

  if (competitionIds.length === 0) {
    return { competitions: [], eventsByCompetition: new Map(), standings: [] };
  }

  const [competitions, standings] = await Promise.all([
    prisma.competition.findMany({
      where: { id: { in: competitionIds } },
      select: { id: true, name: true, level: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.competitionAggregateStanding.findMany({
      where: { competitionId: { in: competitionIds } },
      include: standingInclude,
      orderBy: [{ updatedAt: "desc" }],
    }),
  ]);

  const eventsByCompetition = new Map<
    string,
    Prisma.EventGetPayload<{
      include: { eventGroup: { include: { ageCategory: true } } };
    }>[]
  >();

  for (const compId of competitionIds) {
    const groups = await findEventGroupsInCompetitionAgeScope(compId);
    if (!groups?.length) {
      eventsByCompetition.set(compId, []);
      continue;
    }
    const events = await prisma.event.findMany({
      where: {
        isActive: true,
        eventGroupId: { in: groups.map((g) => g.id) },
      },
      include: { eventGroup: { include: { ageCategory: true } } },
      orderBy: [{ eventGroup: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    eventsByCompetition.set(compId, events);
  }

  return { competitions, eventsByCompetition, standings };
}

/** @deprecated use findResultListContext */
export async function findManyForResultList(
  user: { role: import("@prisma/client").Role; stateId: string | null; districtId: string | null },
  opts?: { competitionId?: string; search?: string }
) {
  const ctx = await findResultListContext(user, opts);
  return ctx.standings;
}
