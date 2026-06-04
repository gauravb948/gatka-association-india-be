import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as aboutUsRepository from "../repositories/aboutUs.repository.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as stateRepository from "../repositories/state.repository.js";
import { AppError } from "../lib/errors.js";
import type { DbUser } from "../types/user.js";
import {
  aboutUsAdminListQuerySchema,
  aboutUsCreateBodySchema,
  aboutUsPatchBodySchema,
  aboutUsPublicQuerySchema,
} from "../validators/aboutUs.validators.js";

async function fetchPublicAboutUsForState(stateId: string) {
  const trimmed = stateId.trim();
  if (!trimmed) {
    throw new AppError(400, "State id is required", "INVALID_PARAMS");
  }
  const state = await stateRepository.findById(trimmed);
  if (!state) throw new AppError(404, "State not found", "STATE_NOT_FOUND");
  const row = await aboutUsRepository.findByStateId(trimmed);
  if (!row) {
    throw new AppError(404, "About us not found for this state", "ABOUT_US_NOT_FOUND");
  }
  return row;
}

/** State admins: `User.stateId` or, if missing on legacy rows, their `StateRegistration` row. */
async function effectiveStateAdminStateId(actor: DbUser): Promise<string | null> {
  if (actor.role !== "STATE_ADMIN") return null;
  if (actor.stateId) return actor.stateId;
  const reg = await stateRegistrationRepo.findStateIdByApplicantUserId(actor.id);
  return reg?.stateId ?? null;
}

async function resolveAdminAboutUsListWhere(
  actor: DbUser,
  queryStateId?: string
): Promise<Prisma.AboutUsWhereInput | undefined> {
  if (actor.role === "NATIONAL_ADMIN") {
    return queryStateId !== undefined ? { stateId: queryStateId } : undefined;
  }
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_STATE");
    }
    if (queryStateId !== undefined && queryStateId !== sid) {
      throw new AppError(
        403,
        "You can only list about-us for your assigned state",
        "FORBIDDEN_STATE"
      );
    }
    return { stateId: sid };
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

async function assertAboutUsInScope(actor: DbUser, rowStateId: string) {
  if (actor.role === "NATIONAL_ADMIN") return;
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid || sid !== rowStateId) {
      throw new AppError(403, "You can only access about-us for your state", "FORBIDDEN_STATE");
    }
    return;
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = aboutUsPublicQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const row = await fetchPublicAboutUsForState(q.data.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function listPublicByPathState(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await fetchPublicAboutUsForState(req.params.stateId ?? "");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = aboutUsAdminListQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const where = await resolveAdminAboutUsListWhere(actor, q.data.stateId);
    const rows = await aboutUsRepository.findManyForAdmin(where);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const row = await aboutUsRepository.findById(req.params.id);
    if (!row) throw new AppError(404, "About us not found");
    await assertAboutUsInScope(actor, row.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = aboutUsCreateBodySchema.parse(req.body);

    if (actor.role === "STATE_ADMIN") {
      const sid = await effectiveStateAdminStateId(actor);
      if (!sid || sid !== body.stateId) {
        throw new AppError(403, "You can only create about-us for your state", "FORBIDDEN_STATE");
      }
    }

    const state = await stateRepository.findById(body.stateId);
    if (!state) throw new AppError(400, "State not found", "STATE_NOT_FOUND");

    const existing = await aboutUsRepository.findByStateId(body.stateId);
    if (existing) {
      throw new AppError(409, "About us already exists for this state", "CONFLICT");
    }

    const data: Prisma.AboutUsCreateInput = {
      logoUrl: body.logoUrl,
      stateTitle: body.stateTitle,
      stateTitleNative: body.stateTitleNative ?? null,
      phoneNo: body.phoneNo ?? null,
      email: body.email ?? null,
      fbUrl: body.fbUrl ?? null,
      ytUrl: body.ytUrl ?? null,
      instaUrl: body.instaUrl ?? null,
      address: body.address ?? null,
      state: { connect: { id: body.stateId } },
    };

    const row = await aboutUsRepository.createAboutUs(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = aboutUsPatchBodySchema.parse(req.body);
    const existing = await aboutUsRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "About us not found");
    await assertAboutUsInScope(actor, existing.stateId);

    if (actor.role === "STATE_ADMIN") {
      if (body.stateId !== undefined && body.stateId !== existing.stateId) {
        throw new AppError(403, "Cannot move about-us to another state", "FORBIDDEN_STATE");
      }
    }

    if (body.stateId !== undefined && body.stateId !== existing.stateId) {
      const state = await stateRepository.findById(body.stateId);
      if (!state) throw new AppError(400, "State not found", "STATE_NOT_FOUND");
      const clash = await aboutUsRepository.findAnotherByStateId(body.stateId, existing.id);
      if (clash) {
        throw new AppError(409, "About us already exists for that state", "CONFLICT");
      }
    }

    const { stateId: _sid, ...rest } = body;
    const data: Prisma.AboutUsUpdateInput = {
      ...rest,
      ...(body.stateId !== undefined ? { state: { connect: { id: body.stateId } } } : {}),
    };

    const row = await aboutUsRepository.updateAboutUs(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await aboutUsRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "About us not found");
    await assertAboutUsInScope(actor, existing.stateId);
    await aboutUsRepository.deleteAboutUs(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}