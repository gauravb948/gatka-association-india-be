import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as noticeRepository from "../repositories/notice.repository.js";
import * as nationalNoticeRepository from "../repositories/nationalNotice.repository.js";
import { AppError } from "../lib/errors.js";
import {
  nationalNoticeBodySchema,
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

/** `GET /notices/national` — public singleton national notice (may be null). */
export async function getNational(_req: Request, res: Response, next: NextFunction) {
  try {
    const row = await nationalNoticeRepository.get();
    res.json(row);
  } catch (e) {
    next(e);
  }
}

/** `PUT /notices/national` — upsert the singleton national notice (national admin). */
export async function upsertNational(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const body = nationalNoticeBodySchema.parse(req.body);
    const row = await nationalNoticeRepository.upsert({
      title: body.title,
      body: body.body,
      display: body.display,
      updatedById: u.id,
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
}
