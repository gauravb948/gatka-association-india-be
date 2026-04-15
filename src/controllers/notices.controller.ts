import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import type { Notice, Role } from "@prisma/client";
import * as noticeRepository from "../repositories/notice.repository.js";
import { AppError } from "../lib/errors.js";
import type { DbUser } from "../types/user.js";
import { noticeBodySchema } from "../validators/notice.validators.js";

function noticeVisibleToUser(n: Notice, u: DbUser): boolean {
  if (n.targetRole && n.targetRole !== u.role) return false;
  const hasState = Boolean(n.stateId);
  const hasDistrict = Boolean(n.districtId);
  const hasTc = Boolean(n.trainingCenterId);
  if (!hasState && !hasDistrict && !hasTc) return true;
  if (hasTc) return n.trainingCenterId === u.trainingCenterId;
  if (hasDistrict) return n.districtId === u.districtId;
  if (hasState) return n.stateId === u.stateId;
  return false;
}

export async function inbox(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const rows = await noticeRepository.findManyRecent(200);
    const filtered = rows.filter((n) => noticeVisibleToUser(n, u));
    res.json(filtered);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = noticeBodySchema.parse(req.body);
    const u = req.dbUser!;
    if (u.role === "TRAINING_CENTER") {
      body.trainingCenterId = u.trainingCenterId;
      body.districtId = u.districtId ?? null;
      body.stateId = u.stateId ?? null;
    } else if (u.role === "DISTRICT_ADMIN") {
      body.districtId = u.districtId;
      body.stateId = u.stateId;
      body.trainingCenterId = null;
    } else if (u.role === "STATE_ADMIN") {
      body.stateId = u.stateId;
      body.districtId = null;
      body.trainingCenterId = null;
    } else if (u.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Cannot post notices");
    }
    const data: Prisma.NoticeCreateInput = {
      author: { connect: { id: u.id } },
      title: body.title,
      body: body.body,
      targetRole: (body.targetRole ?? null) as Role | null,
    };
    if (body.stateId) data.state = { connect: { id: body.stateId } };
    if (body.districtId) data.district = { connect: { id: body.districtId } };
    if (body.trainingCenterId) {
      data.trainingCenter = { connect: { id: body.trainingCenterId } };
    }
    const row = await noticeRepository.createNotice(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}
