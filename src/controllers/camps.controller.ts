import type { CampLevel, Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as campRepository from "../repositories/camp.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import * as sessionRepository from "../repositories/session.repository.js";
import { AppError } from "../lib/errors.js";
import {
  campBodySchema,
  campPatchSchema,
  campsListQuerySchema,
} from "../validators/camp.validators.js";
import { assertUserInCampGeography } from "../lib/eligibility.js";
import type { DbUser } from "../types/user.js";
import { prisma } from "../lib/prisma.js";

function inferCampLevel(user: DbUser): CampLevel {
  if (user.role === "NATIONAL_ADMIN") return "NATIONAL";
  if (user.role === "STATE_ADMIN") return "STATE";
  if (user.role === "DISTRICT_ADMIN") return "DISTRICT";
  throw new AppError(403, "Forbidden");
}

async function resolveActiveSessionId(): Promise<string> {
  const sessions = await sessionRepository.findManyActive();
  const first = sessions[0];
  if (!first) {
    throw new AppError(
      400,
      "No active session; create or activate a session first",
      "NO_ACTIVE_SESSION"
    );
  }
  return first.id;
}

async function assertCampCreationScope(
  level: CampLevel,
  stateIds: string[],
  districtIds: string[],
  user: DbUser
) {
  if (user.role === "NATIONAL_ADMIN") return;
  if (user.role === "STATE_ADMIN") {
    if (level === "NATIONAL") throw new AppError(403, "Forbidden");
    if (stateIds.length && stateIds.some((id) => id !== user.stateId)) {
      throw new AppError(403, "Forbidden");
    }
    if (districtIds.length) {
      const rows = await prisma.district.findMany({
        where: { id: { in: districtIds } },
        select: { stateId: true },
      });
      if (rows.length !== districtIds.length) throw new AppError(400, "Unknown district id");
      if (rows.some((r) => r.stateId !== user.stateId)) throw new AppError(403, "Forbidden");
    }
    return;
  }
  if (user.role === "DISTRICT_ADMIN") {
    if (level !== "DISTRICT") throw new AppError(403, "District can only create district-level camps");
    if (districtIds.length && districtIds.some((id) => id !== user.districtId)) {
      throw new AppError(403, "Forbidden");
    }
    if (stateIds.length && user.stateId && stateIds.some((id) => id !== user.stateId)) {
      throw new AppError(403, "Forbidden");
    }
    return;
  }
  throw new AppError(403, "Forbidden");
}

async function validateCampGeographyInput(stateIds: string[], districtIds: string[]) {
  if (stateIds.length) {
    const n = await prisma.state.count({ where: { id: { in: stateIds } } });
    if (n !== stateIds.length) throw new AppError(400, "Unknown state id");
  }
  if (districtIds.length) {
    const rows = await prisma.district.findMany({
      where: { id: { in: districtIds } },
      select: { id: true, stateId: true },
    });
    if (rows.length !== districtIds.length) throw new AppError(400, "Unknown district id");
    if (stateIds.length) {
      const allowed = new Set(stateIds);
      for (const r of rows) {
        if (!allowed.has(r.stateId)) {
          throw new AppError(400, "A selected district is not in the selected states");
        }
      }
    }
  }
}

async function resolveUserGeoForCamp(user: DbUser): Promise<{
  stateId: string;
  districtId: string;
} | null> {
  if (user.role === "PLAYER") {
    const p = await playerRepository.findProfileByUserId(user.id);
    if (!p) return null;
    return { stateId: p.stateId, districtId: p.districtId };
  }
  if (user.role === "TRAINING_CENTER" && user.trainingCenter) {
    return {
      stateId: user.trainingCenter.district.state.id,
      districtId: user.trainingCenter.district.id,
    };
  }
  if (user.districtId && user.stateId) {
    return { stateId: user.stateId, districtId: user.districtId };
  }
  if (user.districtId) {
    const row = await prisma.district.findUnique({
      where: { id: user.districtId },
      select: { stateId: true },
    });
    if (row) return { stateId: row.stateId, districtId: user.districtId };
  }
  if (user.stateId) {
    return { stateId: user.stateId, districtId: user.districtId ?? "" };
  }
  return null;
}

async function assertCanManageCamp(
  user: DbUser,
  camp: {
    level: CampLevel;
    states: { stateId: string }[];
    districts: { districtId: string }[];
  }
) {
  if (user.role === "NATIONAL_ADMIN") return;
  if (user.role === "STATE_ADMIN") {
    if (camp.level === "NATIONAL") {
      throw new AppError(403, "Cannot manage national camp", "FORBIDDEN_SCOPE");
    }
    if (!user.stateId) throw new AppError(403, "Forbidden");
    if (camp.states.length > 0) {
      if (camp.states.some((s) => s.stateId !== user.stateId)) {
        throw new AppError(403, "Forbidden");
      }
      return;
    }
    if (camp.districts.length > 0) {
      const rows = await prisma.district.findMany({
        where: { id: { in: camp.districts.map((d) => d.districtId) } },
        select: { stateId: true },
      });
      if (rows.some((r) => r.stateId !== user.stateId)) {
        throw new AppError(403, "Forbidden");
      }
      return;
    }
    return;
  }
  if (user.role === "DISTRICT_ADMIN") {
    if (camp.level !== "DISTRICT") throw new AppError(403, "Forbidden");
    if (!user.districtId) throw new AppError(403, "Forbidden");
    if (camp.districts.length === 0) throw new AppError(403, "Forbidden");
    if (camp.districts.some((d) => d.districtId !== user.districtId)) {
      throw new AppError(403, "Forbidden");
    }
    return;
  }
  throw new AppError(403, "Forbidden");
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const q = campsListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const { items, total } = await campRepository.findManyPaginated({
      skip,
      take: q.pageSize,
      nameContains: q.name,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = campBodySchema.parse(req.body);
    const stateIds = [...new Set(body.stateIds)];
    const districtIds = [...new Set(body.districtIds)];

    const level = inferCampLevel(req.dbUser!);
    const sessionId = await resolveActiveSessionId();

    await assertCampCreationScope(level, stateIds, districtIds, req.dbUser!);
    await validateCampGeographyInput(stateIds, districtIds);

    const roles = [...new Set(body.allowedSignupRoles)];

    const data: Prisma.CampCreateInput = {
      session: { connect: { id: sessionId } },
      createdBy: { connect: { id: req.dbUser!.id } },
      level,
      name: body.name.trim(),
      venue: body.venue.trim(),
      startDate: new Date(body.startDate.trim()),
      endDate: new Date(body.endDate.trim()),
      registrationOpensAt: new Date(body.registrationOpensAt.trim()),
      registrationClosesAt: new Date(body.registrationClosesAt.trim()),
      allowedSignupRoles: roles,
      states: {
        create: stateIds.map((stateId) => ({
          state: { connect: { id: stateId } },
        })),
      },
      districts: {
        create: districtIds.map((districtId) => ({
          district: { connect: { id: districtId } },
        })),
      },
    };

    const row = await campRepository.createCamp(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = campPatchSchema.parse(req.body);
    const camp = await campRepository.findByIdWithScope(req.params.id);
    if (!camp) throw new AppError(404, "Camp not found");
    if (camp.isClosed) {
      throw new AppError(400, "Cannot edit a closed camp", "CAMP_CLOSED");
    }
    await assertCanManageCamp(req.dbUser!, camp);

    const stateIds =
      body.stateIds !== undefined ? [...new Set(body.stateIds)] : undefined;
    const districtIds =
      body.districtIds !== undefined ? [...new Set(body.districtIds)] : undefined;

    if (stateIds !== undefined && districtIds !== undefined) {
      await assertCampCreationScope(camp.level, stateIds, districtIds, req.dbUser!);
      await validateCampGeographyInput(stateIds, districtIds);
    }

    const data: Prisma.CampUpdateInput = {};
    if (!camp.createdById) {
      data.createdBy = { connect: { id: req.dbUser!.id } };
    }
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.venue !== undefined) data.venue = body.venue.trim();
    if (body.startDate !== undefined) data.startDate = new Date(body.startDate.trim());
    if (body.endDate !== undefined) data.endDate = new Date(body.endDate.trim());
    if (body.registrationOpensAt !== undefined) {
      data.registrationOpensAt = new Date(body.registrationOpensAt.trim());
    }
    if (body.registrationClosesAt !== undefined) {
      data.registrationClosesAt = new Date(body.registrationClosesAt.trim());
    }
    if (body.allowedSignupRoles !== undefined) {
      data.allowedSignupRoles = [...new Set(body.allowedSignupRoles)];
    }

    const geo =
      stateIds !== undefined && districtIds !== undefined
        ? { stateIds, districtIds }
        : undefined;

    const updated = await campRepository.updateCampAndGeo(camp.id, data, { geo });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function close(req: Request, res: Response, next: NextFunction) {
  try {
    const camp = await campRepository.findByIdWithScope(req.params.id);
    if (!camp) throw new AppError(404, "Camp not found");
    await assertCanManageCamp(req.dbUser!, camp);
    const updated = await campRepository.updateCampAndGeo(camp.id, { isClosed: true });
    res.json(updated);
  } catch (e) {
    next(e);
  }
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const camp = await campRepository.findByIdWithScope(req.params.id);
    if (!camp) throw new AppError(404, "Camp not found");
    if (camp.isClosed) {
      throw new AppError(400, "Camp is closed", "CAMP_CLOSED");
    }

    const u = req.dbUser!;
    const now = new Date();

    if (camp.registrationOpensAt && now < camp.registrationOpensAt) {
      throw new AppError(400, "Registration is not open yet", "CAMP_REGISTRATION_CLOSED");
    }
    if (camp.registrationClosesAt && now > camp.registrationClosesAt) {
      throw new AppError(400, "Registration has closed", "CAMP_REGISTRATION_CLOSED");
    }

    if (
      camp.allowedSignupRoles.length > 0 &&
      !camp.allowedSignupRoles.includes(u.role)
    ) {
      throw new AppError(
        403,
        "This camp is not open for your account type",
        "CAMP_ROLE_NOT_ALLOWED"
      );
    }

    const needsGeo = camp.states.length > 0 || camp.districts.length > 0;
    if (needsGeo) {
      const geo = await resolveUserGeoForCamp(u);
      if (!geo || (!geo.districtId && camp.districts.length > 0)) {
        throw new AppError(
          400,
          "Your profile must include state and district to register for this camp",
          "CAMP_PROFILE_GEO_REQUIRED"
        );
      }
      assertUserInCampGeography(camp, geo);
    }

    const reg = await campRepository.createCampRegistration({
      camp: { connect: { id: camp.id } },
      user: { connect: { id: u.id } },
      status: "REGISTERED",
    });
    res.status(201).json(reg);
  } catch (e) {
    next(e);
  }
}

export async function listRegistrations(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await campRepository.findRegistrationsByCamp(req.params.id);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
