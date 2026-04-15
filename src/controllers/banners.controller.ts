import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as bannerRepository from "../repositories/banner.repository.js";
import { AppError } from "../lib/errors.js";
import {
  bannerCreateBodySchema,
  bannerPatchBodySchema,
} from "../validators/banner.validators.js";

export async function listPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await bannerRepository.findManyPublicActive();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await bannerRepository.findManyAll();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await bannerRepository.findById(req.params.id);
    if (!row) throw new AppError(404, "Banner not found");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = bannerCreateBodySchema.parse(req.body);
    const data: Prisma.BannerCreateInput = {
      imageUrl: body.imageUrl,
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    };
    const row = await bannerRepository.createBanner(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = bannerPatchBodySchema.parse(req.body);
    const data: Prisma.BannerUpdateInput = { ...body };
    const row = await bannerRepository.updateBanner(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await bannerRepository.deleteBanner(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

