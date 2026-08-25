import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import * as weaponRepo from "../repositories/weapon.repository.js";
import { weaponCreateSchema, weaponPatchSchema } from "../validators/weapon.validators.js";

export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await weaponRepo.findManyActive();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await weaponRepo.findManyAll();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = weaponCreateSchema.parse(req.body);
    const data: Prisma.WeaponUncheckedCreateInput = {
      name: body.name,
      namePa: body.namePa ?? null,
      description: body.description ?? null,
      imageUrl: body.imageUrl,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    };
    const row = await weaponRepo.create(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await weaponRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Weapon not found");
    const body = weaponPatchSchema.parse(req.body);
    const row = await weaponRepo.update(existing.id, body);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await weaponRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Weapon not found");
    await weaponRepo.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
