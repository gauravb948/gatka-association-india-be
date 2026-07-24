import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  resolveCmsAdminStateFilter,
  resolveCmsWriteStateId,
} from "../lib/cmsScope.js";
import * as messageRepo from "../repositories/message.repository.js";
import {
  messageAdminListQuerySchema,
  messageCreateSchema,
  messagePatchSchema,
  messagePublicPathStateSchema,
} from "../validators/message.validators.js";

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const params = messagePublicPathStateSchema.parse(req.params);
    await assertStateExistsIfPresent(params.stateId);
    const rows = await messageRepo.findManyByState(params.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listPublicNational(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await messageRepo.findManyByState(null);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = messageAdminListQuerySchema.safeParse(req.query);
    if (!parsed.success) throw parsed.error;

    const actor = req.dbUser!;
    const filter = await resolveCmsAdminStateFilter(actor, parsed.data.stateId);
    const rows = await messageRepo.findMany(filter);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const row = await messageRepo.findById(req.params.id);
    if (!row) throw new AppError(404, "Message not found");
    await assertCmsRowInScope(actor, row.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = messageCreateSchema.parse(req.body);
    const stateId = await resolveCmsWriteStateId(actor, body.stateId);

    const data: Prisma.MessageUncheckedCreateInput = {
      imageUrl: body.imageUrl,
      name: body.name,
      message: body.message,
      designation: body.designation,
      stateId,
    };

    const row = await messageRepo.create(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await messageRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Message not found");
    await assertCmsRowInScope(actor, existing.stateId);

    const body = messagePatchSchema.parse(req.body);
    let nextStateId: string | null | undefined = undefined;
    if (body.stateId !== undefined) {
      nextStateId = await resolveCmsWriteStateId(actor, body.stateId);
      if (actor.role === "STATE_ADMIN" && nextStateId !== existing.stateId) {
        throw new AppError(403, "Cannot move messages to another state", "FORBIDDEN_STATE");
      }
    }

    const { stateId: _sid, ...rest } = body;
    const data: Prisma.MessageUncheckedUpdateInput = {
      ...rest,
      ...(nextStateId !== undefined ? { stateId: nextStateId } : {}),
    };

    const row = await messageRepo.update(existing.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await messageRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Message not found");
    await assertCmsRowInScope(actor, existing.stateId);

    await messageRepo.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
