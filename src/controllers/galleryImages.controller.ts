import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  resolveCmsAdminStateFilter,
  resolveCmsWriteStateId,
} from "../lib/cmsScope.js";
import * as galleryImageRepo from "../repositories/galleryImage.repository.js";
import {
  galleryAdminListQuerySchema,
  galleryImageCreateSchema,
  galleryImagePatchSchema,
  galleryPublicPathStateSchema,
} from "../validators/galleryImage.validators.js";

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const params = galleryPublicPathStateSchema.parse(req.params);
    await assertStateExistsIfPresent(params.stateId);
    const rows = await galleryImageRepo.findManyByState(params.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listPublicNational(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await galleryImageRepo.findManyByState(null);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const parsed = galleryAdminListQuerySchema.safeParse(req.query);
    if (!parsed.success) throw parsed.error;
    const filter = await resolveCmsAdminStateFilter(actor, parsed.data.stateId);
    const rows = await galleryImageRepo.findMany(filter);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = galleryImageCreateSchema.parse(req.body);
    const stateId = await resolveCmsWriteStateId(actor, body.stateId);

    const data: Prisma.GalleryImageUncheckedCreateInput = {
      imageUrl: body.imageUrl,
      caption: body.caption,
      category: body.category ?? null,
      categoryPa: body.categoryPa ?? null,
      sortOrder: body.sortOrder ?? 0,
      stateId,
    };

    const row = await galleryImageRepo.create(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await galleryImageRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Gallery image not found");
    await assertCmsRowInScope(actor, existing.stateId);

    const body = galleryImagePatchSchema.parse(req.body);
    let nextStateId: string | null | undefined = undefined;
    if (body.stateId !== undefined) {
      nextStateId = await resolveCmsWriteStateId(actor, body.stateId);
      if (actor.role === "STATE_ADMIN" && nextStateId !== existing.stateId) {
        throw new AppError(403, "Cannot move gallery images to another state", "FORBIDDEN_STATE");
      }
    }

    const { stateId: _sid, ...rest } = body;
    const data: Prisma.GalleryImageUncheckedUpdateInput = {
      ...rest,
      ...(nextStateId !== undefined ? { stateId: nextStateId } : {}),
    };
    const row = await galleryImageRepo.update(existing.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await galleryImageRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Gallery image not found");
    await assertCmsRowInScope(actor, existing.stateId);

    await galleryImageRepo.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
