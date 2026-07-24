import { z } from "zod";
import { AppError } from "./errors.js";
import * as stateRegistrationRepo from "../repositories/stateRegistration.repository.js";
import * as stateRepository from "../repositories/state.repository.js";
import type { DbUser } from "../types/user.js";

/**
 * Normalize CMS state scope from query/body.
 * - missing / "" / "national" / "null" → null (national site)
 * - otherwise a state id string
 */
export function normalizeCmsStateId(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const s = String(raw).trim();
  if (s === "" || s.toLowerCase() === "national" || s.toLowerCase() === "null") return null;
  return s;
}

/** Zod: optional CMS state id; null means national. */
export const optionalNullableCmsStateId = z.preprocess(
  (v) => {
    if (v === undefined) return undefined;
    return normalizeCmsStateId(v);
  },
  z.union([z.string().min(1), z.null()]).optional()
);

/** Zod: create/public — state id or null (national). Required key may still be optional for national-only create. */
export const cmsStateIdInput = z.preprocess(
  (v) => normalizeCmsStateId(v === undefined ? null : v),
  z.union([z.string().min(1), z.null()])
);

/** State admins: `User.stateId` or legacy `StateRegistration` fallback. */
export async function effectiveStateAdminStateId(actor: DbUser): Promise<string | null> {
  if (actor.role !== "STATE_ADMIN") return null;
  if (actor.stateId) return actor.stateId;
  const reg = await stateRegistrationRepo.findStateIdByApplicantUserId(actor.id);
  return reg?.stateId ?? null;
}

/**
 * Resolve write target stateId for CMS create/update.
 * National admin: omit / null / `national` → national (`null`); otherwise that state.
 * State admin: always their assigned state.
 */
export async function resolveCmsWriteStateId(
  actor: DbUser,
  requested: string | null | undefined
): Promise<string | null> {
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_STATE");
    }
    if (requested === null || requested === undefined) {
      return sid;
    }
    if (requested !== sid) {
      throw new AppError(403, "You can only manage CMS for your own state", "FORBIDDEN_STATE");
    }
    return sid;
  }

  if (actor.role === "NATIONAL_ADMIN") {
    // Same default as admin list: no stateId → national CMS
    if (requested === undefined || requested === null) return null;
    const state = await stateRepository.findById(requested);
    if (!state) throw new AppError(400, "State not found", "STATE_NOT_FOUND");
    return requested;
  }

  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

/**
 * Admin list filter.
 * National admin: omit / null / `national` → national CMS only; otherwise that state.
 * State admin: always their assigned state.
 */
export async function resolveCmsAdminStateFilter(
  actor: DbUser,
  queryStateId?: string | null
): Promise<{ stateId: string | null }> {
  if (actor.role === "NATIONAL_ADMIN") {
    if (queryStateId === undefined || queryStateId === null) return { stateId: null };
    return { stateId: queryStateId };
  }
  if (actor.role === "STATE_ADMIN") {
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid) {
      throw new AppError(403, "State admin has no assigned state", "FORBIDDEN_STATE");
    }
    if (queryStateId !== undefined && queryStateId !== sid) {
      throw new AppError(403, "You can only list CMS for your assigned state", "FORBIDDEN_STATE");
    }
    return { stateId: sid };
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

export async function assertCmsRowInScope(actor: DbUser, rowStateId: string | null) {
  if (actor.role === "NATIONAL_ADMIN") return;
  if (actor.role === "STATE_ADMIN") {
    if (rowStateId === null) {
      throw new AppError(403, "You cannot access national CMS", "FORBIDDEN_STATE");
    }
    const sid = await effectiveStateAdminStateId(actor);
    if (!sid || sid !== rowStateId) {
      throw new AppError(403, "You can only access CMS for your state", "FORBIDDEN_STATE");
    }
    return;
  }
  throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
}

/** Validate a concrete state exists when stateId is non-null (public reads). */
export async function assertStateExistsIfPresent(stateId: string | null) {
  if (stateId === null) return;
  const state = await stateRepository.findById(stateId);
  if (!state) throw new AppError(404, "State not found", "STATE_NOT_FOUND");
}
