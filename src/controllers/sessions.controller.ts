import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as sessionRepository from "../repositories/session.repository.js";
import { sessionBodySchema } from "../validators/session.validators.js";

export async function listActive(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await sessionRepository.findManyActive();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await sessionRepository.findManyAll();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = sessionBodySchema.parse(req.body);
    const row = await sessionRepository.createSession({
      name: body.name,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      isActive: body.isActive ?? true,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = sessionBodySchema.partial().parse(req.body);
    const data: Prisma.SessionUpdateInput = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);
    const row = await sessionRepository.updateSession(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}
