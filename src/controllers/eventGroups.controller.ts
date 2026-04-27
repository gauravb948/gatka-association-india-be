import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as eventGroupRepository from "../repositories/eventGroup.repository.js";
import * as eventRepository from "../repositories/event.repository.js";
import { AppError } from "../lib/errors.js";
import {
  eventBodySchema,
  eventGroupBodySchema,
} from "../validators/eventGroup.validators.js";

export async function listActive(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await eventGroupRepository.findManyActiveWithAgeCategory();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await eventGroupRepository.findManyAllWithAgeCategory();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = eventGroupBodySchema.parse(req.body);
    const row = await eventGroupRepository.createEventGroup({
      segment: body.segment,
      gender: body.gender,
      ageCategory: { connect: { id: body.ageCategoryId } },
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
    const body = eventGroupBodySchema.partial().parse(req.body);
    const { ageCategoryId, ...rest } = body;
    const data: Prisma.EventGroupUpdateInput = { ...rest };
    if (ageCategoryId) {
      data.ageCategory = { connect: { id: ageCategoryId } };
    }
    const row = await eventGroupRepository.updateEventGroup(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function listEventsByGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const group = await eventGroupRepository.findById(req.params.id);
    if (!group) throw new AppError(404, "Event group not found");
    const rows = await eventRepository.findManyByGroup(req.params.id);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = eventBodySchema.parse(req.body);
    const g = await eventGroupRepository.findById(req.params.id);
    if (!g) throw new AppError(404, "Event group not found");
    const row = await eventRepository.createEvent({
      eventGroup: { connect: { id: req.params.id } },
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder ?? 0,
      isActive: body.isActive ?? true,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patchEvent(req: Request, res: Response, next: NextFunction) {
  try {
    const body = eventBodySchema.partial().parse(req.body);
    const row = await eventRepository.updateEvent(req.params.eventId, body);
    res.json(row);
  } catch (e) {
    next(e);
  }
}
