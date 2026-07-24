import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as aboutUsRepository from "../repositories/aboutUs.repository.js";
import { AppError } from "../lib/errors.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  resolveCmsAdminStateFilter,
  resolveCmsWriteStateId,
} from "../lib/cmsScope.js";
import {
  aboutUsAdminListQuerySchema,
  aboutUsCreateBodySchema,
  aboutUsPatchBodySchema,
  aboutUsPublicPathStateSchema,
  aboutUsPublicQuerySchema,
} from "../validators/aboutUs.validators.js";

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

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = aboutUsAdminListQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const filter = await resolveCmsAdminStateFilter(actor, q.data.stateId);
    const rows = await aboutUsRepository.findManyForAdmin({ stateId: filter.stateId });
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
    await assertCmsRowInScope(actor, row.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = aboutUsCreateBodySchema.parse(req.body);
    const stateId = await resolveCmsWriteStateId(actor, body.stateId);

    const existing = await aboutUsRepository.findByCmsStateId(stateId);
    if (existing) {
      throw new AppError(
        409,
        stateId === null
          ? "About us already exists for the national site"
          : "About us already exists for this state",
        "CONFLICT"
      );
    }

    const data: Prisma.AboutUsUncheckedCreateInput = {
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
    await assertCmsRowInScope(actor, existing.stateId);

    let nextStateId: string | null | undefined = undefined;
    if (body.stateId !== undefined) {
      nextStateId = await resolveCmsWriteStateId(actor, body.stateId);
      if (actor.role === "STATE_ADMIN" && nextStateId !== existing.stateId) {
        throw new AppError(403, "Cannot move about-us to another state", "FORBIDDEN_STATE");
      }
      if (nextStateId !== existing.stateId) {
        const clash = await aboutUsRepository.findAnotherByStateId(nextStateId, existing.id);
        if (clash) {
          throw new AppError(409, "About us already exists for that scope", "CONFLICT");
        }
      }
    }

    const { stateId: _sid, ...rest } = body;
    const data: Prisma.AboutUsUncheckedUpdateInput = {
      ...rest,
      ...(nextStateId !== undefined ? { stateId: nextStateId } : {}),
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
    await assertCmsRowInScope(actor, existing.stateId);
    await aboutUsRepository.deleteAboutUs(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
