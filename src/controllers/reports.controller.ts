import type { NextFunction, Request, Response } from "express";
import * as playerRepository from "../repositories/player.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import { buildCompetitionRegistrationStats } from "../lib/competitionRegistrationStats.js";
import { buildCompetitionEventRegistrationReport } from "../lib/competitionEventRegistrationReport.js";
import { buildCompetitionEventGroupParticipantsReport } from "../lib/competitionEventGroupParticipantsReport.js";
import { buildCompetitionAgeWiseReport } from "../lib/competitionAgeWiseReport.js";
import { assertCanViewCompetitionParticipants } from "../lib/competitionManagementScope.js";
import { AppError } from "../lib/errors.js";
import { buildReportPlayerProfileWhere } from "../lib/reportPlayerProfileFilters.js";
import {
  competitionAgeWiseReportQuerySchema,
  competitionEventGroupParticipantsReportQuerySchema,
  competitionEventRegistrationReportQuerySchema,
  competitionRegistrationsReportQuerySchema,
} from "../validators/reports.validators.js";

export async function competitionRegistrations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actor = req.dbUser!;
    const q = competitionRegistrationsReportQuerySchema.parse(req.query);
    const rows = await participationRepository.findParticipationsForCompetitionStatsReport(
      {
        role: actor.role,
        stateId: actor.stateId,
        districtId: actor.districtId,
      },
      {
        competitionId: q.competitionId,
        search: q.search,
      }
    );
    const stats = buildCompetitionRegistrationStats(rows);
    const total = stats.length;
    const skip = (q.page - 1) * q.pageSize;
    const pageItems = stats.slice(skip, skip + q.pageSize).map((item, index) => ({
      srNo: skip + index + 1,
      ...item,
    }));
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items: pageItems,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function competitionEventRegistrations(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actor = req.dbUser!;
    const q = competitionEventRegistrationReportQuerySchema.parse(req.query);
    const comp = await competitionRepository.findByIdForPlayerEligibility(q.competitionId);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionParticipants(actor, comp);

    const playerProfileWhere = await buildReportPlayerProfileWhere(actor, q);
    const data = await buildCompetitionEventRegistrationReport(
      q.competitionId,
      q.gender,
      playerProfileWhere
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function competitionEventGroupParticipants(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const actor = req.dbUser!;
    const q = competitionEventGroupParticipantsReportQuerySchema.parse(req.query);
    const comp = await competitionRepository.findByIdForPlayerEligibility(q.competitionId);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionParticipants(actor, comp);

    const playerProfileWhere = await buildReportPlayerProfileWhere(actor, q);
    const ageAsOf = comp.ageTillDate ?? new Date();
    const data = await buildCompetitionEventGroupParticipantsReport(
      q.competitionId,
      q.gender,
      playerProfileWhere,
      ageAsOf
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function competitionAgeWise(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = competitionAgeWiseReportQuerySchema.parse(req.query);
    const comp = await competitionRepository.findByIdForPlayerEligibility(q.competitionId);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionParticipants(actor, comp);

    const playerProfileWhere = await buildReportPlayerProfileWhere(actor, { gender: q.gender });
    const data = await buildCompetitionAgeWiseReport(
      q.competitionId,
      comp.level,
      q.gender,
      playerProfileWhere
    );
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function playersExpiring(req: Request, res: Response, next: NextFunction) {
  try {
    const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
    const until = new Date();
    until.setUTCDate(until.getUTCDate() + days);
    const u = req.dbUser!;
    const where: {
      membershipValidUntil?: { lte: Date; gte: Date };
      districtId?: string;
      trainingCenterId?: string;
      stateId?: string;
    } = {
      membershipValidUntil: { lte: until, gte: new Date() },
    };
    if (u.role === "TRAINING_CENTER") where.trainingCenterId = u.trainingCenterId!;
    if (u.role === "DISTRICT_ADMIN") where.districtId = u.districtId!;
    if (u.role === "STATE_ADMIN") where.stateId = u.stateId!;
    const rows = await playerRepository.findManyProfiles({
      where,
      orderBy: { membershipValidUntil: "asc" },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function playersExpired(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const where: {
      membershipValidUntil?: { lt: Date };
      districtId?: string;
      trainingCenterId?: string;
      stateId?: string;
    } = {
      membershipValidUntil: { lt: new Date() },
    };
    if (u.role === "TRAINING_CENTER") where.trainingCenterId = u.trainingCenterId!;
    if (u.role === "DISTRICT_ADMIN") where.districtId = u.districtId!;
    if (u.role === "STATE_ADMIN") where.stateId = u.stateId!;
    const rows = await playerRepository.findManyProfiles({
      where,
      orderBy: { membershipValidUntil: "desc" },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
