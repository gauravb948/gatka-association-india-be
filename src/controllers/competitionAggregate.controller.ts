import type { NextFunction, Request, Response } from "express";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as competitionAggregateStandingRepository from "../repositories/competitionAggregateStanding.repository.js";
import { assertCanManageCompetition } from "../lib/competitionManagementScope.js";
import {
  aggregateUnitTypeForLevel,
  assertAggregateUnitsInCompetitionScope,
} from "../lib/competitionAggregateUnits.js";
import { formatEventGroupLabel } from "../lib/competitionResultList.js";
import { competitionAggregateResultsBodySchema } from "../validators/competitionAggregate.validators.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

async function assertEventInCompetitionScope(competitionId: string, eventId: string) {
  const groups = await competitionRepository.findEventGroupsInCompetitionAgeScope(competitionId);
  if (!groups) throw new AppError(404, "Competition not found");
  const event = await prisma.event.findFirst({
    where: {
      id: eventId,
      isActive: true,
      eventGroupId: { in: groups.map((g) => g.id) },
    },
    include: { eventGroup: { include: { ageCategory: true } } },
  });
  if (!event) {
    throw new AppError(400, "Event is not in this competition's age scope", "INVALID_EVENT");
  }
  return event;
}

export async function replaceAggregateResults(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionAggregateResultsBodySchema.parse(req.body);
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanManageCompetition(req.dbUser!, comp);
    await assertEventInCompetitionScope(comp.id, body.eventId);

    const unitType = aggregateUnitTypeForLevel(comp.level);
    const allIds = [body.firstPlace, ...body.secondPlace, ...body.thirdPlace];
    await assertAggregateUnitsInCompetitionScope(
      { states: comp.states, districts: comp.districts },
      unitType,
      allIds
    );

    const createdById = req.dbUser!.id;
    const rows = [
      {
        rankBand: 1,
        unitType,
        unitId: body.firstPlace,
        tieOrder: 0,
        createdById,
      },
      ...body.secondPlace.map((unitId, tieOrder) => ({
        rankBand: 2,
        unitType,
        unitId,
        tieOrder,
        createdById,
      })),
      ...body.thirdPlace.map((unitId, tieOrder) => ({
        rankBand: 3,
        unitType,
        unitId,
        tieOrder,
        createdById,
      })),
    ];

    await competitionAggregateStandingRepository.replaceForCompetitionEvent(
      comp.id,
      body.eventId,
      rows
    );
    const payload = await buildResponsePayload(comp.id, comp.level);
    res.status(201).json(payload);
  } catch (e) {
    next(e);
  }
}

export async function getAggregateResults(req: Request, res: Response, next: NextFunction) {
  try {
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanManageCompetition(req.dbUser!, comp);
    const payload = await buildResponsePayload(comp.id, comp.level);
    res.json(payload);
  } catch (e) {
    next(e);
  }
}

async function buildResponsePayload(competitionId: string, level: import("@prisma/client").CompetitionLevel) {
  const rows = await competitionAggregateStandingRepository.findManyByCompetition(competitionId);
  const unitType =
    rows.length > 0 ? rows[0].unitType : aggregateUnitTypeForLevel(level);

  if (rows.length === 0) {
    return {
      competitionId,
      level,
      unitType,
      events: [] as unknown[],
    };
  }

  const ids = [...new Set(rows.map((r) => r.unitId))];
  const enriched = await competitionAggregateStandingRepository.enrichByUnitType(unitType, ids);

  const mapRow = (r: (typeof rows)[0]) => ({
    id: r.id,
    eventId: r.eventId,
    rankBand: r.rankBand,
    unitType: r.unitType,
    unitId: r.unitId,
    tieOrder: r.tieOrder,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    createdBy: r.createdBy,
    unit: enriched.get(r.unitId) ?? null,
  });

  const byEvent = new Map<string, (typeof rows)[0]["event"]>();
  for (const row of rows) {
    byEvent.set(row.eventId, row.event);
  }

  const events = [...byEvent.entries()].map(([eventId, event]) => ({
    eventId,
    event: event.name,
    ageGroup: event.eventGroup.ageCategory.name,
    eventGroup: formatEventGroupLabel(event.eventGroup.segment, event.eventGroup.gender),
    firstPlace: rows.filter((r) => r.eventId === eventId && r.rankBand === 1).map(mapRow),
    secondPlace: rows.filter((r) => r.eventId === eventId && r.rankBand === 2).map(mapRow),
    thirdPlace: rows.filter((r) => r.eventId === eventId && r.rankBand === 3).map(mapRow),
  }));

  return {
    competitionId,
    level,
    unitType,
    events,
  };
}
