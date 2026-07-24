import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as bannerRepository from "../repositories/banner.repository.js";
import { AppError } from "../lib/errors.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  resolveCmsAdminStateFilter,
  resolveCmsWriteStateId,
} from "../lib/cmsScope.js";
import {
  bannerAdminListQuerySchema,
  bannerCreateBodySchema,
  bannerPatchBodySchema,
  bannerPublicPathStateSchema,
  bannerPublicQuerySchema,
} from "../validators/banner.validators.js";

async function fetchPublicActiveBanners(stateId: string | null) {
  await assertStateExistsIfPresent(stateId);
  return bannerRepository.findManyPublicActive(stateId);
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = bannerPublicQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const stateId = q.data.stateId === undefined ? null : q.data.stateId;
    const rows = await fetchPublicActiveBanners(stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listPublicNational(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await fetchPublicActiveBanners(null);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** Path `:stateId` may be a real state id or the literal `national`. */
export async function listPublicByPathState(req: Request, res: Response, next: NextFunction) {
  try {
    const params = bannerPublicPathStateSchema.parse(req.params);
    const rows = await fetchPublicActiveBanners(params.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = bannerAdminListQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const filter = await resolveCmsAdminStateFilter(actor, q.data.stateId);
    const rows = await bannerRepository.findManyForAdmin({ stateId: filter.stateId });
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const row = await bannerRepository.findById(req.params.id);
    if (!row) throw new AppError(404, "Banner not found");
    await assertCmsRowInScope(actor, row.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = bannerCreateBodySchema.parse(req.body);
    const stateId = await resolveCmsWriteStateId(actor, body.stateId);

    const data: Prisma.BannerUncheckedCreateInput = {
      imageUrl: body.imageUrl,
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
      stateId,
    };
    const row = await bannerRepository.createBanner(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = bannerPatchBodySchema.parse(req.body);
    const existing = await bannerRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "Banner not found");
    await assertCmsRowInScope(actor, existing.stateId);

    let nextStateId: string | null | undefined = undefined;
    if (body.stateId !== undefined) {
      nextStateId = await resolveCmsWriteStateId(actor, body.stateId);
      if (actor.role === "STATE_ADMIN" && nextStateId !== existing.stateId) {
        throw new AppError(403, "Cannot move banners to another state", "FORBIDDEN_STATE");
      }
    }

    const { stateId: _sid, ...rest } = body;
    const data: Prisma.BannerUncheckedUpdateInput = {
      ...rest,
      ...(nextStateId !== undefined ? { stateId: nextStateId } : {}),
    };
    const row = await bannerRepository.updateBanner(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await bannerRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "Banner not found");
    await assertCmsRowInScope(actor, existing.stateId);
    await bannerRepository.deleteBanner(existing.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
