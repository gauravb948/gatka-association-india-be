import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import { AppError } from "../lib/errors.js";
import {
  getAgeAsOfDate,
  playerGenderMatchesCompetition,
} from "../lib/eligibility.js";
import { fitsAgeCategory } from "../lib/age.js";
import type { DbUser } from "../types/user.js";
import { competitionBodySchema } from "../validators/competition.validators.js";

function assertCompetitionScope(
  level: string,
  stateId: string | null | undefined,
  districtId: string | null | undefined,
  user: DbUser
) {
  if (user.role === "NATIONAL_ADMIN") return;
  if (user.role === "STATE_ADMIN") {
    if (level === "NATIONAL") throw new AppError(403, "Forbidden");
    if (stateId && stateId !== user.stateId) throw new AppError(403, "Forbidden");
    return;
  }
  if (user.role === "DISTRICT_ADMIN") {
    if (level !== "DISTRICT") throw new AppError(403, "District can only create district comps");
    if (districtId && districtId !== user.districtId) throw new AppError(403, "Forbidden");
    return;
  }
  if (user.role === "TRAINING_CENTER") {
    throw new AppError(403, "TC cannot create competitions");
  }
  throw new AppError(403, "Forbidden");
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const sessionId = req.query.sessionId as string | undefined;
    const rows = await competitionRepository.findMany(sessionId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionBodySchema.parse(req.body);
    assertCompetitionScope(
      body.level,
      body.stateId ?? null,
      body.districtId ?? null,
      req.dbUser!
    );
    const data: Prisma.CompetitionCreateInput = {
      session: { connect: { id: body.sessionId } },
      level: body.level,
      name: body.name,
      gender: body.gender,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      registrationOpensAt: body.registrationOpensAt
        ? new Date(body.registrationOpensAt)
        : null,
      registrationClosesAt: body.registrationClosesAt
        ? new Date(body.registrationClosesAt)
        : null,
      finalSubmitRequiresPayment: body.finalSubmitRequiresPayment ?? true,
    };
    if (body.stateId) data.state = { connect: { id: body.stateId } };
    if (body.districtId) data.district = { connect: { id: body.districtId } };
    if (body.ageCategoryId) {
      data.ageCategory = { connect: { id: body.ageCategoryId } };
    }
    if (body.eventIds?.length) {
      data.events = {
        create: body.eventIds.map((eventId) => ({
          event: { connect: { id: eventId } },
        })),
      };
    }
    const comp = await competitionRepository.createWithEvents(data);
    res.status(201).json(comp);
  } catch (e) {
    next(e);
  }
}

export async function eligiblePlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const comp = await competitionRepository.findByIdWithAgeCategory(req.params.id);
    if (!comp) throw new AppError(404, "Competition not found");

    const players = await playerRepository.findManyEligibleActive();

    const asOf = await getAgeAsOfDate();
    const filtered = players.filter((p) => {
      if (!playerGenderMatchesCompetition(p.gender, comp.gender)) return false;
      if (comp.ageCategory) {
        return fitsAgeCategory(
          p.dateOfBirth,
          asOf,
          comp.ageCategory.ageFrom,
          comp.ageCategory.ageTo
        );
      }
      return true;
    });

    res.json(
      filtered.map((p) => ({
        userId: p.userId,
        fullName: p.fullName,
        gender: p.gender,
        registrationNumber: p.registrationNumber,
        districtId: p.districtId,
        trainingCenterId: p.trainingCenterId,
      }))
    );
  } catch (e) {
    next(e);
  }
}
