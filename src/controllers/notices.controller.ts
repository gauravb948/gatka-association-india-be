import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as noticeRepository from "../repositories/notice.repository.js";
import * as nationalNoticeRepository from "../repositories/nationalNotice.repository.js";
import { AppError } from "../lib/errors.js";
import {
  nationalNoticeCreateBodySchema,
  nationalNoticePatchBodySchema,
  noticeBodySchema,
  noticeListQuerySchema,
} from "../validators/notice.validators.js";

const NOTICE_AUTHOR_ROLES = new Set(["NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"]);

/** `GET /notices/inbox` — paginated notices targeting the current user's role. */
export async function inbox(req: Request, res: Response, next: NextFunction) {
  try {
    const q = noticeListQuerySchema.parse(req.query);
    const u = req.dbUser!;
    const skip = (q.page - 1) * q.pageSize;
    const { items, total } = await noticeRepository.findInboxPaginated(
      u.role,
      skip,
      q.pageSize
    );
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

/** `GET /notices/mine` — paginated notices authored by the current admin. */
export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const q = noticeListQuerySchema.parse(req.query);
    const u = req.dbUser!;
    const skip = (q.page - 1) * q.pageSize;
    const { items, total } = await noticeRepository.findMinePaginated(
      u.id,
      skip,
      q.pageSize
    );
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({ items, page: q.page, pageSize: q.pageSize, total, totalPages });
  } catch (e) {
    next(e);
  }
}

/** `POST /notices` — create a hierarchy notice (national/state/district admins). */
export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    if (!NOTICE_AUTHOR_ROLES.has(u.role)) {
      throw new AppError(403, "Cannot post notices", "FORBIDDEN_ROLE");
    }
    const body = noticeBodySchema.parse(req.body);
    const data: Prisma.NoticeCreateInput = {
      author: { connect: { id: u.id } },
      title: body.title,
      body: body.body,
      targetRoles: body.targetRoles,
    };
    const row = await noticeRepository.createNotice(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

/** `DELETE /notices/:id` — author or national admin can delete. */
export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const existing = await noticeRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "Notice not found");
    if (existing.authorId !== u.id && u.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Cannot delete this notice", "FORBIDDEN_ROLE");
    }
    await noticeRepository.deleteById(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

/** `GET /notices/national` — public: every display=true notice, ordered for the home-page slider. */
export async function listNationalPublic(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await nationalNoticeRepository.findManyPublicActive();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** `GET /notices/national/admin` — every notice, regardless of display (national admin). */
export async function listNationalAdmin(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await nationalNoticeRepository.findManyForAdmin();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** `POST /notices/national` — create a national notice message (national admin). */
export async function createNational(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = nationalNoticeCreateBodySchema.parse(req.body);
    const row = await nationalNoticeRepository.create({
      body: body.body,
      display: body.display ?? true,
      sortOrder: body.sortOrder ?? 0,
      updatedById: u.id,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

/** `PATCH /notices/national/:id` — update a national notice message (national admin). */
export async function patchNational(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const existing = await nationalNoticeRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "National notice not found");
    const body = nationalNoticePatchBodySchema.parse(req.body);
    const row = await nationalNoticeRepository.update(existing.id, {
      ...(body.body !== undefined ? { body: body.body } : {}),
      ...(body.display !== undefined ? { display: body.display } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      updatedById: u.id,
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
}

/** `DELETE /notices/national/:id` — remove a national notice message (national admin). */
export async function removeNational(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await nationalNoticeRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "National notice not found");
    await nationalNoticeRepository.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
