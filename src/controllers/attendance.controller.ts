import type { NextFunction, Request, Response } from "express";
import * as attendanceRepository from "../repositories/attendance.repository.js";
import { AppError } from "../lib/errors.js";
import { attendanceMarkSchema } from "../validators/attendance.validators.js";

export async function mark(req: Request, res: Response, next: NextFunction) {
  try {
    const body = attendanceMarkSchema.parse(req.body);
    const marker = req.dbUser!;
    const allowed =
      marker.role === "COACH" ||
      marker.role === "TRAINING_CENTER" ||
      marker.role === "DISTRICT_ADMIN" ||
      marker.role === "STATE_ADMIN" ||
      marker.role === "NATIONAL_ADMIN";
    if (!allowed) throw new AppError(403, "Cannot mark attendance");

    const d = new Date(body.date + "T12:00:00.000Z");
    const row = await attendanceRepository.createAttendance({
      type: body.type,
      date: d,
      user: { connect: { id: body.userId } },
      markedBy: { connect: { id: marker.id } },
      present: body.present ?? true,
      competition: body.competitionId
        ? { connect: { id: body.competitionId } }
        : undefined,
      camp: body.campId ? { connect: { id: body.campId } } : undefined,
      trainingCenterId: body.trainingCenterId,
      notes: body.notes,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function listByUser(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.dbUser!.id !== req.params.userId && req.dbUser!.role === "PLAYER") {
      throw new AppError(403, "Forbidden");
    }
    const rows = await attendanceRepository.findManyByUser(req.params.userId, 200);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function competitionSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await attendanceRepository.findManyTournamentByCompetition(
      req.params.competitionId
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
