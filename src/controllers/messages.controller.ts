import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import * as messageRepo from "../repositories/message.repository.js";
import {
  messageCreateSchema,
  messagePatchSchema,
} from "../validators/message.validators.js";

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await messageRepo.findManyByState(req.params.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await messageRepo.findMany();
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
