import type { NextFunction, Request, Response } from "express";
import * as competitionAttendanceRepository from "../repositories/competitionAttendance.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { assertCanManageCompetition, assertCanViewCompetitionScopedReport } from "../lib/competitionManagementScope.js";
import { actorPlayerProfileScopeWhere } from "../lib/competitionParticipation.js";
import {
  competitionAttendanceBulkMarkSchema,
  competitionAttendanceMarkSchema,
  competitionAttendanceReportQuerySchema,
} from "../validators/competitionAttendance.validators.js";

const userReportSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  playerProfile: {
    select: {
      fullName: true,
      registrationNumber: true,
      gender: true,
      photoUrl: true,
      trainingCenterId: true,
      trainingCenter: { select: { id: true, name: true } },
    },
  },
} as const;

async function loadCompetitionOrThrow(competitionId: string) {
  const comp = await competitionRepository.findByIdForPlayerEligibility(competitionId);
  if (!comp) throw new AppError(404, "Competition not found");
  return comp;
}

export async function mark(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionAttendanceMarkSchema.parse(req.body);
    const marker = req.dbUser!;
    const comp = await loadCompetitionOrThrow(body.competitionId);
    await assertCanManageCompetition(marker, comp);

    const row = await competitionAttendanceRepository.markOne({
      competitionId: body.competitionId,
      eventId: body.eventId,
      userId: body.userId,
      markedById: marker.id,
      present: body.present ?? true,
      notes: body.notes,
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function markBulk(req: Request, res: Response, next: NextFunction) {
  try {
    const body = competitionAttendanceBulkMarkSchema.parse(req.body);
    const marker = req.dbUser!;
    const comp = await loadCompetitionOrThrow(body.competitionId);
    await assertCanManageCompetition(marker, comp);

    const items = body.items.map((item) => ({
      competitionId: body.competitionId,
      eventId: body.eventId,
      userId: item.userId,
      markedById: marker.id,
      present: item.present ?? true,
      notes: item.notes,
    }));
    const rows = await competitionAttendanceRepository.markMany(items);
    res.json({ results: rows });
  } catch (e) {
    next(e);
  }
}

export async function report(req: Request, res: Response, next: NextFunction) {
  try {
    const marker = req.dbUser!;
    if (marker.role === "TRAINING_CENTER") {
      throw new AppError(403, "Training centers cannot view competition attendance", "FORBIDDEN_SCOPE");
    }
    const q = competitionAttendanceReportQuerySchema.parse(req.query);
    const comp = await loadCompetitionOrThrow(q.competitionId);
    await assertCanViewCompetitionScopedReport(marker, comp);

    const scope = actorPlayerProfileScopeWhere(marker);
    const playerProfileWhere = Object.keys(scope).length > 0 ? scope : undefined;

    const playerIdSet = await participationRepository.findPlayerUserIdsParticipatedInEvent(
      q.competitionId,
      q.eventId
    );
    const playerIds = [...playerIdSet];

    if (playerIds.length === 0) {
      return res.json({
        kind: "competition" as const,
        competitionId: q.competitionId,
        eventId: q.eventId,
        present: [],
        absent: [],
      });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { in: playerIds },
        ...(playerProfileWhere ? { playerProfile: playerProfileWhere } : {}),
      },
      orderBy: { id: "asc" },
      select: userReportSelect,
    });

    const attRows = await competitionAttendanceRepository.findByCompetitionEvent(
      q.competitionId,
      q.eventId
    );
    const attByUser = new Map(attRows.map((a) => [a.userId, a]));

    const present: { user: (typeof users)[number]; attendance: (typeof attRows)[number] | null; isPresent: boolean }[] = [];
    const absent: { user: (typeof users)[number]; attendance: (typeof attRows)[number] | null; isPresent: boolean }[] = [];
    for (const user of users) {
      if (user.role !== "PLAYER") continue;
      const att = attByUser.get(user.id) ?? null;
      const isPresent = !!(att && att.present);
      const row = { user, attendance: att, isPresent };
      if (isPresent) present.push(row);
      else absent.push(row);
    }

    res.json({
      kind: "competition" as const,
      competitionId: q.competitionId,
      eventId: q.eventId,
      present,
      absent,
    });
  } catch (e) {
    next(e);
  }
}
