import type { NextFunction, Request, Response } from "express";
import * as playerRepository from "../repositories/player.repository.js";
import * as migrationRepository from "../repositories/migration.repository.js";
import * as districtRepository from "../repositories/district.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";
import { AppError } from "../lib/errors.js";
import {
  adminMigratePlayersBodySchema,
  migrationRequestBodySchema,
} from "../validators/migration.validators.js";

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

function blockedMessage(fullName: string, competitions: Array<{ name: string }>) {
  const names = competitions.map((c) => c.name).filter(Boolean).join(", ");
  return `Cannot migrate ${fullName}: registered in upcoming/ongoing competition(s): ${names}. Unregister them first, then try again.`;
}

/** National admin: move one or many players to a district + training center. */
export async function adminMigratePlayers(req: Request, res: Response, next: NextFunction) {
  try {
    const body = adminMigratePlayersBodySchema.parse(req.body);
    if (body.playerUserIds.length === 0) {
      throw new AppError(400, "playerUserIds is required", "INVALID_MIGRATE");
    }

    const district = await districtRepository.findById(body.toDistrictId);
    if (!district) throw new AppError(400, "District not found", "INVALID_DISTRICT");
    const toStateId = district.stateId?.trim();
    if (!toStateId) {
      throw new AppError(400, "District has no state", "INVALID_DISTRICT");
    }

    const tc = await trainingCenterRepository.findById(body.toTcId);
    if (!tc) throw new AppError(400, "Training center not found", "INVALID_TRAINING_CENTER");
    if (tc.districtId !== body.toDistrictId) {
      throw new AppError(
        400,
        "Training center must belong to the selected district",
        "INVALID_TRAINING_CENTER"
      );
    }

    const profiles = await migrationRepository.findProfilesForAdminMigrate(body.playerUserIds);
    const profileById = new Map(profiles.map((p) => [p.userId, p]));
    const blocking = await migrationRepository.findBlockingCompetitionsByPlayerUserId(
      profiles.map((p) => p.userId)
    );

    const migrated: Array<{ userId: string; fullName: string }> = [];
    const skipped: Array<{ userId: string; fullName: string; reason: string }> = [];
    const blocked: Array<{
      userId: string;
      fullName: string;
      competitions: Array<{ id: string; name: string }>;
      message: string;
    }> = [];

    for (const userId of body.playerUserIds) {
      const profile = profileById.get(userId);
      if (!profile) {
        skipped.push({ userId, fullName: userId, reason: "Player profile not found" });
        continue;
      }
      if (profile.trainingCenterId === body.toTcId && profile.districtId === body.toDistrictId) {
        skipped.push({
          userId,
          fullName: profile.fullName,
          reason: "Already at this training center",
        });
        continue;
      }
      const competitions = blocking.get(userId) ?? [];
      if (competitions.length > 0) {
        blocked.push({
          userId,
          fullName: profile.fullName,
          competitions,
          message: blockedMessage(profile.fullName, competitions),
        });
        continue;
      }

      await migrationRepository.adminMovePlayer({
        userId,
        fromStateId: profile.stateId,
        fromDistrictId: profile.districtId,
        fromTcId: profile.trainingCenterId,
        toStateId,
        toDistrictId: body.toDistrictId,
        toTcId: body.toTcId,
        remarks: body.remarks,
      });
      migrated.push({ userId, fullName: profile.fullName });
    }

    res.json({ migrated, skipped, blocked });
  } catch (e) {
    next(e);
  }
}
