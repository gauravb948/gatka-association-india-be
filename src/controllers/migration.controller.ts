import type { NextFunction, Request, Response } from "express";
import * as playerRepository from "../repositories/player.repository.js";
import * as migrationRepository from "../repositories/migration.repository.js";
import { AppError } from "../lib/errors.js";
import { migrationRequestBodySchema } from "../validators/migration.validators.js";

export async function requestMigration(req: Request, res: Response, next: NextFunction) {
  try {
    const body = migrationRequestBodySchema.parse(req.body);
    const u = req.dbUser!;
    const p = await playerRepository.findProfileByUserId(u.id);
    if (!p) throw new AppError(400, "Player profile required");
    const row = await migrationRepository.createRequest({
      user: { connect: { id: u.id } },
      fromState: { connect: { id: p.stateId } },
      fromDistrictId: p.districtId,
      fromTcId: p.trainingCenterId,
      toState: { connect: { id: body.toStateId } },
      toDistrictId: body.toDistrictId ?? undefined,
      toTcId: body.toTcId ?? undefined,
      status: "PENDING_ORIGIN",
      remarks: body.remarks,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function approveOrigin(req: Request, res: Response, next: NextFunction) {
  try {
    const m = await migrationRepository.findById(req.params.id);
    if (!m) throw new AppError(404, "Not found");
    const u = req.dbUser!;
    if (u.role !== "NATIONAL_ADMIN" && m.fromStateId !== u.stateId) {
      throw new AppError(403, "Forbidden");
    }
    const row = await migrationRepository.updateStatus(m.id, "PENDING_DESTINATION");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function approveDestination(req: Request, res: Response, next: NextFunction) {
  try {
    const m = await migrationRepository.findById(req.params.id);
    if (!m) throw new AppError(404, "Not found");
    const u = req.dbUser!;
    if (u.role !== "NATIONAL_ADMIN" && m.toStateId !== u.stateId) {
      throw new AppError(403, "Forbidden");
    }
    if (!m.toDistrictId || !m.toTcId) {
      throw new AppError(400, "Destination district and TC required");
    }
    await migrationRepository.approveDestinationMoveUser({
      migrationId: m.id,
      userId: m.userId,
      toStateId: m.toStateId,
      toDistrictId: m.toDistrictId,
      toTcId: m.toTcId,
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}
