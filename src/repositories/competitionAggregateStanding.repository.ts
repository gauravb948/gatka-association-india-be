import { prisma } from "../lib/prisma.js";

export async function replaceForCompetition(
  competitionId: string,
  rows: {
    rankBand: number;
    unitType: string;
    unitId: string;
    tieOrder: number;
    createdById: string | null;
  }[]
) {
  return prisma.$transaction(async (tx) => {
    await tx.competitionAggregateStanding.deleteMany({ where: { competitionId } });
    for (const r of rows) {
      await tx.competitionAggregateStanding.create({
        data: {
          competitionId,
          rankBand: r.rankBand,
          unitType: r.unitType,
          unitId: r.unitId,
          tieOrder: r.tieOrder,
          createdById: r.createdById,
        },
      });
    }
    return tx.competitionAggregateStanding.findMany({
      where: { competitionId },
      orderBy: [{ rankBand: "asc" }, { tieOrder: "asc" }],
    });
  });
}

export function findManyByCompetition(competitionId: string) {
  return prisma.competitionAggregateStanding.findMany({
    where: { competitionId },
    orderBy: [{ rankBand: "asc" }, { tieOrder: "asc" }],
    include: {
      createdBy: { select: { id: true, email: true, role: true } },
    },
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
