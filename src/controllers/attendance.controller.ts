import type { NextFunction, Request, Response } from "express";
import * as attendanceRepository from "../repositories/attendance.repository.js";
import { AppError } from "../lib/errors.js";
import {
  attendanceBulkMarkSchema,
  attendanceMarkSchema,
  attendanceReportQuerySchema,
} from "../validators/attendance.validators.js";
import * as attendanceReportRepository from "../repositories/attendanceReport.repository.js";

function canMarkOrReportAttendance(roles: {
  role: string;
}): boolean {
  return (
    roles.role === "COACH" ||
    roles.role === "TRAINING_CENTER" ||
    roles.role === "DISTRICT_ADMIN" ||
    roles.role === "STATE_ADMIN" ||
    roles.role === "NATIONAL_ADMIN"
  );
}

export async function mark(req: Request, res: Response, next: NextFunction) {
  try {
    const body = attendanceMarkSchema.parse(req.body);
    const marker = req.dbUser!;
    if (!canMarkOrReportAttendance(marker)) {
      throw new AppError(403, "Cannot mark attendance");
    }

    const d = new Date(body.date + "T12:00:00.000Z");
    const { row, created } = await attendanceRepository.markAttendance(
      toMarkInput(body, d, marker.id)
    );
    res.status(created ? 201 : 200).json(row);
  } catch (e) {
    next(e);
  }
}

function toMarkInput(
  body: {
    userId: string;
    type: "TOURNAMENT" | "CAMP" | "TC_DAILY";
    present?: boolean;
    date: string;
    competitionId?: string;
    campId?: string;
    trainingCenterId?: string;
    notes?: string;
  },
  date: Date,
  markedById: string
) {
  return {
    userId: body.userId,
    type: body.type,
    date,
    markedById,
    present: body.present ?? true,
    competitionId: body.competitionId,
    campId: body.campId,
    trainingCenterId: body.trainingCenterId,
    notes: body.notes,
  };
}

export async function markBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const body = attendanceBulkMarkSchema.parse(req.body);
    const marker = req.dbUser!;
    if (!canMarkOrReportAttendance(marker)) {
      throw new AppError(403, "Cannot mark attendance");
    }

    const items = body.items.map((it) =>
      toMarkInput(it, new Date(it.date + "T12:00:00.000Z"), marker.id)
    );
    const list = await attendanceRepository.markAttendanceMany(items);
    res.json({
      results: list.map((r) => ({ attendance: r.row, created: r.created })),
    });
  } catch (e) {
    next(e);
  }
}

export async function report(req: Request, res: Response, next: NextFunction) {
  try {
    const marker = req.dbUser!;
    if (!canMarkOrReportAttendance(marker)) {
      throw new AppError(403, "Cannot view attendance report");
    }
    const q = attendanceReportQuerySchema.parse(req.query);
    if (q.trainingCenterId && q.date) {
      const out = await attendanceReportRepository.reportTrainingCenterDay(
        q.trainingCenterId,
        q.date
      );
      return res.json({ kind: "trainingCenter" as const, ...out });
    }
    if (q.competitionId) {
      const out = await attendanceReportRepository.reportCompetition(q.competitionId, {
        eventId: q.eventId,
        dateYmd: q.date,
      });
      return res.json({ kind: "competition" as const, ...out });
    }
    if (q.campId) {
      const out = await attendanceReportRepository.reportCamp(q.campId, q.date);
      return res.json({ kind: "camp" as const, ...out });
    }
    throw new AppError(400, "Invalid report query");
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
