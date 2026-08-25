import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import {
  NATIONAL_ONLY_CMS_PAGES,
  STATE_ONLY_CMS_PAGES,
} from "../lib/cmsPages.js";
import {
  assertCmsRowInScope,
  assertStateExistsIfPresent,
  resolveCmsAdminStateFilter,
  resolveCmsWriteStateId,
} from "../lib/cmsScope.js";
import * as pagesContentRepo from "../repositories/pagesContent.repository.js";
import {
  pagesContentAdminQuerySchema,
  pagesContentPatchSchema,
  pagesContentPublicPathStateSchema,
  pagesContentPublicQuerySchema,
  pagesContentUpsertSchema,
} from "../validators/pagesContent.validators.js";

function assertPageMatchesScope(page: string, stateId: string | null) {
  if (NATIONAL_ONLY_CMS_PAGES.has(page) && stateId !== null) {
    throw new AppError(400, "This page is managed at national scope only", "NATIONAL_PAGE");
  }
  if (STATE_ONLY_CMS_PAGES.has(page) && stateId === null) {
    throw new AppError(400, "This page requires a state", "STATE_PAGE");
  }
}

export async function getPublicNational(req: Request, res: Response, next: NextFunction) {
  try {
    const q = pagesContentPublicQuerySchema.parse(req.query);
    if (STATE_ONLY_CMS_PAGES.has(q.page)) {
      throw new AppError(400, "This page is state-scoped", "STATE_PAGE");
    }
    const row = await pagesContentRepo.findPublicByPageAndState(q.page, null);
    if (!row) throw new AppError(404, "Page content not found", "PAGE_NOT_FOUND");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function getPublicByState(req: Request, res: Response, next: NextFunction) {
  try {
    const params = pagesContentPublicPathStateSchema.parse(req.params);
    const q = pagesContentPublicQuerySchema.parse(req.query);
    await assertStateExistsIfPresent(params.stateId);
    if (NATIONAL_ONLY_CMS_PAGES.has(q.page)) {
      throw new AppError(400, "This page is national-scoped", "NATIONAL_PAGE");
    }
    const row = await pagesContentRepo.findPublicByPageAndState(q.page, params.stateId);
    if (!row) throw new AppError(404, "Page content not found", "PAGE_NOT_FOUND");
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function getAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const q = pagesContentAdminQuerySchema.parse(req.query);
    const filter = await resolveCmsAdminStateFilter(actor, q.stateId);
    assertPageMatchesScope(q.page, filter.stateId);
    const row = await pagesContentRepo.findByPageAndState(q.page, filter.stateId);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function upsert(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const body = pagesContentUpsertSchema.parse(req.body);
    const stateId = await resolveCmsWriteStateId(actor, body.stateId);
    assertPageMatchesScope(body.page, stateId);
    if (NATIONAL_ONLY_CMS_PAGES.has(body.page) && actor.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Only national admin can manage this page", "FORBIDDEN_ROLE");
    }

    const row = await pagesContentRepo.saveByPageAndState(body.page, stateId, {
      title: body.title,
      detailedDescription: body.detailedDescription,
      isEnabled: body.isEnabled ?? true,
    });
    res.status(200).json(row);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const existing = await pagesContentRepo.findById(req.params.id);
    if (!existing) throw new AppError(404, "Page content not found", "PAGE_NOT_FOUND");
    await assertCmsRowInScope(actor, existing.stateId);
    if (NATIONAL_ONLY_CMS_PAGES.has(existing.page) && actor.role !== "NATIONAL_ADMIN") {
      throw new AppError(403, "Only national admin can manage this page", "FORBIDDEN_ROLE");
    }
    const body = pagesContentPatchSchema.parse(req.body);
    const row = await pagesContentRepo.update(existing.id, body);
    res.json(row);
  } catch (e) {
    next(e);
  }
}
