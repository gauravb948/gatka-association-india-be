import type { NextFunction, Request, Response } from "express";
import {
  assertVolunteerRegistrationInScope,
  validatedVolunteerRegistrationListFilters,
  volunteerRegistrationScopeWhere,
} from "../lib/volunteerRegistrationScope.js";
import * as volunteerRegistrationRepo from "../repositories/volunteerRegistration.repository.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import {
  volunteerRegistrationIdParamSchema,
  volunteerRegistrationListQuerySchema,
  volunteerRegistrationPublicQuerySchema,
} from "../validators/volunteerRegistration.validators.js";

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = volunteerRegistrationPublicQuerySchema.parse(req.query);
    if (!q.stateId) {
      res.json([]);
      return;
    }
    const rows = await volunteerRegistrationRepo.findManyPublicPhotos(q.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

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
    const users = await volunteerRegistrationRepo.findLiveVolunteerUsersByEmails(
      items.map((row) => row.email)
    );
    const userByEmail = new Map(users.map((u) => [u.email, u]));
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items: items.map((row) => {
        const user = userByEmail.get(row.email) ?? null;
        return { ...row, userId: user?.id ?? null, user };
      }),
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
    const deletedVolunteer = await prisma.user.findFirst({
      where: { role: "VOLUNTEER", email: row.email, deletedAt: { not: null } },
      select: { id: true },
    });
    if (deletedVolunteer) {
      throw new AppError(404, "Volunteer registration not found", "VOLUNTEER_REGISTRATION_NOT_FOUND");
    }
    const users = await volunteerRegistrationRepo.findLiveVolunteerUsersByEmails([row.email]);
    const user = users[0] ?? null;
    res.json({ ...row, userId: user?.id ?? null, user });
  } catch (e) {
    next(e);
  }
}
