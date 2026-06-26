import type { NextFunction, Request, Response } from "express";
import {
  assertVolunteerRegistrationInScope,
  validatedVolunteerRegistrationListFilters,
  volunteerRegistrationScopeWhere,
} from "../lib/volunteerRegistrationScope.js";
import * as volunteerRegistrationRepo from "../repositories/volunteerRegistration.repository.js";
import {
  volunteerRegistrationIdParamSchema,
  volunteerRegistrationListQuerySchema,
} from "../validators/volunteerRegistration.validators.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = volunteerRegistrationListQuerySchema.parse(req.query);
    const filters = await validatedVolunteerRegistrationListFilters(actor, q);
    const skip = (q.page - 1) * q.pageSize;
    const [items, total] = await volunteerRegistrationRepo.findManyPaginated({
      skip,
      take: q.pageSize,
      scope: volunteerRegistrationScopeWhere(actor),
      ...filters,
    });
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const { id } = volunteerRegistrationIdParamSchema.parse(req.params);
    const row = await assertVolunteerRegistrationInScope(actor, id);
    res.json(row);
  } catch (e) {
    next(e);
  }
}
