import type { NextFunction, Request, Response } from "express";
import * as ageCategoryRepository from "../repositories/ageCategory.repository.js";
import {
  ageCategoryAdminListQuerySchema,
  ageCategoryBodySchema,
} from "../validators/ageCategory.validators.js";
import { AppError } from "../lib/errors.js";

export async function listActive(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await ageCategoryRepository.findManyActiveOrdered();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const q = ageCategoryAdminListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await ageCategoryRepository.findManyAllOrderedPaginated({
      skip,
      take: q.pageSize,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ageCategoryBodySchema.parse(req.body);
    const row = await ageCategoryRepository.createAgeCategory({
      name: body.name,
      ageFrom: body.ageFrom ?? null,
      ageTo: body.ageTo ?? null,
      bandType: body.bandType ?? null,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ageCategoryBodySchema.partial().parse(req.body);
    const row = await ageCategoryRepository.updateAgeCategory(req.params.id, body);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const used = await ageCategoryRepository.countEventGroupsByAgeCategory(req.params.id);
    if (used > 0) {
      throw new AppError(400, "Age category in use by event groups");
    }
    await ageCategoryRepository.deleteAgeCategory(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
