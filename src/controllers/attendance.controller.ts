import type { NextFunction, Request, Response } from "express";
import * as attendanceRepository from "../repositories/attendance.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import { AppError } from "../lib/errors.js";
import { assertCanManageCompetition, assertCanViewCompetitionScopedReport } from "../lib/competitionManagementScope.js";
import { actorPlayerProfileScopeWhere } from "../lib/competitionParticipation.js";
import {
  attendanceBulkMarkSchema,
  attendanceMarkSchema,
  attendanceReportQuerySchema,
} from "../validators/attendance.validators.js";
import * as attendanceReportRepository from "../repositories/attendanceReport.repository.js";
import type { DbUser } from "../types/user.js";

type MarkBody = {
  userId: string;
  type: "TOURNAMENT" | "CAMP" | "TC_DAILY";
  present?: boolean;
  date: string;
  competitionId?: string;
  campId?: string;
  trainingCenterId?: string;
  notes?: string;
};

type CompetitionForAttendance = NonNullable<
  Awaited<ReturnType<typeof competitionRepository.findByIdForPlayerEligibility>>
>;

function canAccessAttendance(roles: { role: string }): boolean {
  return (
    roles.role === "COACH" ||
    roles.role === "TRAINING_CENTER" ||
    roles.role === "DISTRICT_ADMIN" ||
    roles.role === "STATE_ADMIN" ||
    roles.role === "NATIONAL_ADMIN"
  );
}

async function assertCanMarkAttendanceItem(
  marker: DbUser,
  body: Pick<MarkBody, "type" | "competitionId" | "trainingCenterId" | "campId">,
  competitionCache: Map<string, CompetitionForAttendance>
) {
  if (body.type === "TC_DAILY") {
    if (marker.role !== "TRAINING_CENTER") {
      throw new AppError(
        403,
        "Only training centers may mark daily attendance",
        "FORBIDDEN_SCOPE"
      );
    }
    if (!marker.trainingCenterId) {
      throw new AppError(403, "Training center context missing", "FORBIDDEN_SCOPE");
    }
    if (body.trainingCenterId !== marker.trainingCenterId) {
      throw new AppError(
        403,
        "You may only mark daily attendance for your own training center",
        "FORBIDDEN_SCOPE"
      );
    }
    return;
  }

  if (body.type === "TOURNAMENT") {
    if (!body.competitionId) {
      throw new AppError(400, "competitionId is required for tournament attendance");
    }
    let comp = competitionCache.get(body.competitionId);
    if (!comp) {
      const found = await competitionRepository.findByIdForPlayerEligibility(body.competitionId);
      if (!found) throw new AppError(404, "Competition not found");
      comp = found;
      competitionCache.set(body.competitionId, found);
    }
    await assertCanManageCompetition(marker, comp);
    return;
  }

  if (body.type === "CAMP") {
    if (marker.role === "TRAINING_CENTER") {
      throw new AppError(403, "Training centers cannot mark camp attendance", "FORBIDDEN_SCOPE");
    }
    if (!body.campId) {
      throw new AppError(400, "campId is required for camp attendance");
    }
    return;
  }

  throw new AppError(403, "Cannot mark attendance");
}

export async function mark(req: Request, res: Response, next: NextFunction) {
  try {
    const body = attendanceMarkSchema.parse(req.body);
    const marker = req.dbUser!;
    if (!canAccessAttendance(marker)) {
      throw new AppError(403, "Cannot mark attendance");
    }
    await assertCanMarkAttendanceItem(marker, body, new Map());

    const d = new Date(body.date + "T12:00:00.000Z");
    const { row, created } = await attendanceRepository.markAttendance(
      toMarkInput(body, d, marker.id)
    );
    res.status(created ? 201 : 200).json(row);
  } catch (e) {
    next(e);
  }
}

function toMarkInput(body: MarkBody, date: Date, markedById: string) {
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
    if (!canAccessAttendance(marker)) {
      throw new AppError(403, "Cannot mark attendance");
    }

    const competitionCache = new Map<string, CompetitionForAttendance>();
    for (const item of body.items) {
      await assertCanMarkAttendanceItem(marker, item, competitionCache);
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
    if (!canAccessAttendance(marker)) {
      throw new AppError(403, "Cannot view attendance report");
    }
    const q = attendanceReportQuerySchema.parse(req.query);
    if (q.trainingCenterId && q.date) {
      if (marker.role !== "TRAINING_CENTER") {
        throw new AppError(
          403,
          "Only training centers may view daily attendance",
          "FORBIDDEN_SCOPE"
        );
      }
      if (marker.trainingCenterId !== q.trainingCenterId) {
        throw new AppError(
          403,
          "You may only view daily attendance for your own training center",
          "FORBIDDEN_SCOPE"
        );
      }
      const out = await attendanceReportRepository.reportTrainingCenterDay(
        q.trainingCenterId,
        q.date
      );
      return res.json({ kind: "trainingCenter" as const, ...out });
    }
    if (q.competitionId) {
      if (marker.role === "TRAINING_CENTER") {
        throw new AppError(
          403,
          "Training centers cannot view competition attendance",
          "FORBIDDEN_SCOPE"
        );
      }
      const comp = await competitionRepository.findByIdForPlayerEligibility(q.competitionId);
      if (!comp) throw new AppError(404, "Competition not found");
      await assertCanViewCompetitionScopedReport(marker, comp);
      const scope = actorPlayerProfileScopeWhere(marker);
      const out = await attendanceReportRepository.reportCompetition(q.competitionId, {
        eventId: q.eventId,
        dateYmd: q.date,
        playerProfileWhere: Object.keys(scope).length > 0 ? scope : undefined,
      });
      return res.json({ kind: "competition" as const, ...out });
    }
    if (q.campId) {
      if (marker.role === "TRAINING_CENTER") {
        throw new AppError(403, "Training centers cannot view camp attendance", "FORBIDDEN_SCOPE");
      }
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
    const actor = req.dbUser!;
    const comp = await competitionRepository.findByIdForPlayerEligibility(req.params.competitionId);
    if (!comp) throw new AppError(404, "Competition not found");
    await assertCanViewCompetitionScopedReport(actor, comp);
    const rows = await attendanceRepository.findManyTournamentByCompetition(
      req.params.competitionId
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
