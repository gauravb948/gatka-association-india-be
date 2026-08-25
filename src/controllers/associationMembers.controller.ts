import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  resolveCmsAdminStateFilter,
  resolveCmsWriteStateId,
} from "../lib/cmsScope.js";
import * as memberRepo from "../repositories/associationMember.repository.js";
import {
  associationMemberAdminListQuerySchema,
  associationMemberCreateSchema,
  associationMemberPatchSchema,
  associationMemberPublicPathStateSchema,
} from "../validators/associationMember.validators.js";

function requireStateId(stateId: string | null): string {
  if (!stateId) {
    throw new AppError(400, "A state is required for association members", "STATE_REQUIRED");
  }
  return stateId;
}

export async function listPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const params = associationMemberPublicPathStateSchema.parse(req.params);
    if (!params.stateId) {
      throw new AppError(400, "A state is required", "STATE_REQUIRED");
    }
    await assertStateExistsIfPresent(params.stateId);
    const rows = await memberRepo.findManyByState(params.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = associationMemberAdminListQuerySchema.parse(req.query);
    const filter = await resolveCmsAdminStateFilter(actor, q.stateId);
    const stateId = requireStateId(filter.stateId);
    const rows = await memberRepo.findManyForAdmin(stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = associationMemberCreateSchema.parse(req.body);
    const stateId = requireStateId(await resolveCmsWriteStateId(actor, body.stateId));
    const data: Prisma.AssociationMemberUncheckedCreateInput = {
      name: body.name,
      designation: body.designation,
      mobile: body.mobile ?? null,
      photoUrl: body.photoUrl ?? null,
      sortOrder: body.sortOrder ?? 0,
      stateId,
    };
    const row = await memberRepo.create(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await memberRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Member not found");
    await assertCmsRowInScope(actor, existing.stateId);
    const body = associationMemberPatchSchema.parse(req.body);
    const row = await memberRepo.update(existing.id, body);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await memberRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Member not found");
    await assertCmsRowInScope(actor, existing.stateId);
    await memberRepo.remove(existing.id);
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
