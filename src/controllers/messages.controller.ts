import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import * as messageRepo from "../repositories/message.repository.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import type { DbUser } from "../types/user.js";
import {
  messageAdminListQuerySchema,
  messageCreateSchema,
  messagePatchSchema,
} from "../validators/message.validators.js";

/** State admins: `User.stateId` or, if missing on legacy rows, their `StateRegistration` row. */
async function effectiveStateAdminStateId(actor: DbUser): Promise<string | null> {
  if (actor.role !== "STATE_ADMIN") return null;
  if (actor.stateId) return actor.stateId;
  const reg = await stateRegistrationRepo.findStateIdByApplicantUserId(actor.id);
  return reg?.stateId ?? null;
}

async function resolveAdminMessageListWhere(
  actor: DbUser,
  queryStateId?: string
): Promise<{ stateId: string } | undefined> {
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
        "You can only list messages for your assigned state",
        "FORBIDDEN_STATE"
      );
    }
    return { stateId: sid };
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await messageRepo.findManyByState(req.params.stateId);
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
    const filterWhere = await resolveAdminMessageListWhere(actor, parsed.data.stateId);
    const rows = await messageRepo.findMany(filterWhere);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await messageRepo.findById(req.params.id);
    if (!row) throw new AppError(404, "Message not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = messageCreateSchema.parse(req.body);

    if (actor.role === "STATE_ADMIN" && actor.stateId !== body.stateId) {
      throw new AppError(403, "You can only create messages for your own state", "FORBIDDEN_STATE");
    }

    const data: Prisma.MessageCreateInput = {
      imageUrl: body.imageUrl,
      name: body.name,
      message: body.message,
      designation: body.designation,
      state: { connect: { id: body.stateId } },
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

    if (actor.role === "STATE_ADMIN" && actor.stateId !== existing.stateId) {
      throw new AppError(403, "You can only update messages for your own state", "FORBIDDEN_STATE");
    }

    const body = messagePatchSchema.parse(req.body);
    const row = await messageRepo.update(existing.id, body);
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

    if (actor.role === "STATE_ADMIN" && actor.stateId !== existing.stateId) {
      throw new AppError(403, "You can only delete messages from your own state", "FORBIDDEN_STATE");
    }

    await messageRepo.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
