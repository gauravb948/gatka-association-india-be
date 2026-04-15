import type { NextFunction, Request, Response } from "express";
import * as participationRepository from "../repositories/participation.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import { AppError } from "../lib/errors.js";
import { participationRecordBodySchema } from "../validators/participation.validators.js";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = participationRecordBodySchema.parse(req.body);
    const comp = await competitionRepository.findByIdBasic(body.competitionId);
    if (!comp) throw new AppError(404, "Competition not found");
    if (comp.level !== body.level) {
      throw new AppError(400, "Level mismatch with competition");
    }
    const row = await participationRepository.createParticipation({
      session: { connect: { id: body.sessionId } },
      playerUser: { connect: { id: body.playerUserId } },
      competition: { connect: { id: body.competitionId } },
      level: body.level,
      participated: body.participated ?? true,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}
