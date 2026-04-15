import type { NextFunction, Request, Response } from "express";
import type { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors.js";
import * as galleryImageRepo from "../repositories/galleryImage.repository.js";
import { galleryImageCreateSchema } from "../validators/galleryImage.validators.js";

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await galleryImageRepo.findManyByState(req.params.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await galleryImageRepo.findMany();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = galleryImageCreateSchema.parse(req.body);

    if (actor.role === "STATE_ADMIN" && actor.stateId !== body.stateId) {
      throw new AppError(403, "You can only add images for your own state", "FORBIDDEN_STATE");
    }

    const data: Prisma.GalleryImageCreateInput = {
      imageUrl: body.imageUrl,
      state: { connect: { id: body.stateId } },
      caption: body.caption,
    };

    const row = await galleryImageRepo.create(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await galleryImageRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Gallery image not found");

    if (actor.role === "STATE_ADMIN" && actor.stateId !== existing.stateId) {
      throw new AppError(403, "You can only delete images from your own state", "FORBIDDEN_STATE");
    }

    await galleryImageRepo.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
