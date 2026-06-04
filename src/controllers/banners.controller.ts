import type { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as bannerRepository from "../repositories/banner.repository.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as stateRepository from "../repositories/state.repository.js";
import { AppError } from "../lib/errors.js";
import type { DbUser } from "../types/user.js";
import {
  bannerAdminListQuerySchema,
  bannerCreateBodySchema,
  bannerPatchBodySchema,
  bannerPublicQuerySchema,
} from "../validators/banner.validators.js";

async function fetchPublicActiveBannersForState(stateId: string) {
  const trimmed = stateId.trim();
  if (!trimmed) {
    throw new AppError(400, "State id is required", "INVALID_PARAMS");
  }
  const state = await stateRepository.findById(trimmed);
  if (!state) throw new AppError(404, "State not found", "STATE_NOT_FOUND");
  return bannerRepository.findManyPublicActive(trimmed);
}

/** State admins: `User.stateId` or, if missing on legacy rows, their `StateRegistration` row. */
async function effectiveStateAdminStateId(actor: DbUser): Promise<string | null> {
  if (actor.role !== "STATE_ADMIN") return null;
  if (actor.stateId) return actor.stateId;
  const reg = await stateRegistrationRepo.findStateIdByApplicantUserId(actor.id);
  return reg?.stateId ?? null;
}

async function resolveAdminBannerListWhere(
  actor: DbUser,
  queryStateId?: string
): Promise<Prisma.BannerWhereInput | undefined> {
  if (actor.role === "NATIONAL_ADMIN") {
    return queryStateId !== undefined ? { stateId: queryStateId } : undefined;
  }
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_STATE");
    }
    if (queryStateId !== undefined && queryStateId !== sid) {
      throw new AppError(
        403,
        "You can only list banners for your assigned state",
        "FORBIDDEN_STATE"
      );
    }
    return { stateId: sid };
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

async function assertBannerInScope(actor: DbUser, bannerStateId: string) {
  if (actor.role === "NATIONAL_ADMIN") return;
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid || sid !== bannerStateId) {
      throw new AppError(403, "You can only access banners for your state", "FORBIDDEN_STATE");
    }
    return;
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

export async function listPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = bannerPublicQuerySchema.safeParse(req.query);
    if (!q.success) {
      throw q.error;
    }
    const rows = await fetchPublicActiveBannersForState(q.data.stateId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

/** Same data as GET `/banners/public?stateId=…`; use path when embedding the state's id in the URL. */
export async function listPublicByPathState(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await fetchPublicActiveBannersForState(req.params.stateId ?? "");
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = bannerAdminListQuerySchema.safeParse(req.query);
    if (!q.success) throw q.error;
    const where = await resolveAdminBannerListWhere(actor, q.data.stateId);
    const rows = await bannerRepository.findManyForAdmin(where);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const row = await bannerRepository.findById(req.params.id);
    if (!row) throw new AppError(404, "Banner not found");
    await assertBannerInScope(actor, row.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = bannerCreateBodySchema.parse(req.body);
    if (actor.role === "STATE_ADMIN") {
      const sid = await effectiveStateAdminStateId(actor);
      if (!sid || sid !== body.stateId) {
        throw new AppError(403, "You can only create banners for your state", "FORBIDDEN_STATE");
      }
    }
    const state = await stateRepository.findById(body.stateId);
    if (!state) throw new AppError(400, "State not found", "STATE_NOT_FOUND");

    const data: Prisma.BannerCreateInput = {
      imageUrl: body.imageUrl,
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
      state: { connect: { id: body.stateId } },
    };
    const row = await bannerRepository.createBanner(data);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = bannerPatchBodySchema.parse(req.body);
    const existing = await bannerRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "Banner not found");
    await assertBannerInScope(actor, existing.stateId);
    if (actor.role === "STATE_ADMIN") {
      if (
        body.stateId !== undefined &&
        body.stateId !== existing.stateId
      ) {
        throw new AppError(
          403,
          "Cannot move banners to another state",
          "FORBIDDEN_STATE"
        );
      }
    }
    if (body.stateId !== undefined && actor.role === "NATIONAL_ADMIN") {
      const state = await stateRepository.findById(body.stateId);
      if (!state) throw new AppError(400, "State not found", "STATE_NOT_FOUND");
    }
    const { stateId, ...rest } = body;
    const data: Prisma.BannerUpdateInput = {
      ...rest,
      ...(stateId !== undefined ? { state: { connect: { id: stateId } } } : {}),
    };
    const row = await bannerRepository.updateBanner(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await bannerRepository.findById(req.params.id);
    if (!existing) throw new AppError(404, "Banner not found");
    await assertBannerInScope(actor, existing.stateId);
    await bannerRepository.deleteBanner(existing.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
