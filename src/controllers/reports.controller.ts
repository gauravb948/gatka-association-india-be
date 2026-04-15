import type { NextFunction, Request, Response } from "express";
import * as playerRepository from "../repositories/player.repository.js";

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
