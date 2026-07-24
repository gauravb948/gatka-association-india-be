import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as aboutUsRepository from "../repositories/aboutUs.repository.js";
import { AppError } from "../lib/errors.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  effectiveStateAdminStateId,
} from "../lib/cmsScope.js";
import type { DbUser } from "../types/user.js";
import {
  aboutUsCreateBodySchema,
  aboutUsPatchBodySchema,
  aboutUsPublicPathStateSchema,
  aboutUsPublicQuerySchema,
} from "../validators/aboutUs.validators.js";

/** Own CMS scope only: national admin → national (`null`); state admin → their state. */
async function resolveOwnAboutUsStateId(actor: DbUser): Promise<string | null> {
  if (actor.role === "NATIONAL_ADMIN") return null;
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_STATE");
    }
    return sid;
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

async function fetchPublicAboutUs(stateId: string | null) {
  await assertStateExistsIfPresent(stateId);
  const row = await aboutUsRepository.findByCmsStateId(stateId);
  if (!row) {
    throw new AppError(
      404,
      stateId === null ? "About us not found for national site" : "About us not found for this state",
      "ABOUT_US_NOT_FOUND"
    );
  }
  return row;
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = aboutUsPublicQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const stateId = q.data.stateId === undefined ? null : q.data.stateId;
    const row = await fetchPublicAboutUs(stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function listPublicNational(_req: Request, res: Response, next: NextFunction) {
  try {
    const row = await fetchPublicAboutUs(null);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function listPublicByPathState(req: Request, res: Response, next: NextFunction) {
  try {
    const params = aboutUsPublicPathStateSchema.parse(req.params);
    const row = await fetchPublicAboutUs(params.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

/** `GET /about-us` — current admin's about-us only (national for national admin). */
export async function getMine(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const stateId = await resolveOwnAboutUsStateId(actor);
    const row = await aboutUsRepository.findByCmsStateId(stateId);
    if (!row) {
      throw new AppError(
        404,
        stateId === null ? "About us not found for national site" : "About us not found for your state",
        "ABOUT_US_NOT_FOUND"
      );
    }
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const row = await aboutUsRepository.findById(req.params.id);
    if (!row) throw new AppError(404, "About us not found");
    await assertCmsRowInScope(actor, row.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

/** Create or update the current admin's about-us only. */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = aboutUsCreateBodySchema.parse(req.body);
    const stateId = await resolveOwnAboutUsStateId(actor);

    const fields = {
      logoUrl: body.logoUrl,
      stateTitle: body.stateTitle,
      stateTitleNative: body.stateTitleNative ?? null,
      phoneNo: body.phoneNo ?? null,
      email: body.email ?? null,
      fbUrl: body.fbUrl ?? null,
      ytUrl: body.ytUrl ?? null,
      instaUrl: body.instaUrl ?? null,
      address: body.address ?? null,
      stateId,
    };

    const existing = await aboutUsRepository.findByCmsStateId(stateId);
    if (existing) {
      const row = await aboutUsRepository.updateAboutUs(existing.id, fields);
      return res.json(row);
    }

    const row = await aboutUsRepository.createAboutUs(fields);
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
    await assertCmsRowInScope(actor, existing.stateId);

    // Scope is fixed to the admin's own about-us; ignore any stateId in the body.
    const { stateId: _sid, ...rest } = body;
    const data: Prisma.AboutUsUncheckedUpdateInput = { ...rest };

    const row = await aboutUsRepository.updateAboutUs(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

/** Patch current admin's about-us without needing the row id. */
export async function patchMine(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = aboutUsPatchBodySchema.parse(req.body);
    const stateId = await resolveOwnAboutUsStateId(actor);
    const existing = await aboutUsRepository.findByCmsStateId(stateId);
    if (!existing) {
      throw new AppError(404, "About us not found", "ABOUT_US_NOT_FOUND");
    }

    const { stateId: _sid, ...rest } = body;
    const row = await aboutUsRepository.updateAboutUs(existing.id, rest);
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
    await assertCmsRowInScope(actor, existing.stateId);
    await aboutUsRepository.deleteAboutUs(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
