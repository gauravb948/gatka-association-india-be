import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt.js";
import { AppError } from "../lib/errors.js";
import { assertHierarchyEnabled, loadUserForAccess } from "../lib/access.js";
import type { DbUser } from "../types/user.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) {
    return next(new AppError(401, "Missing bearer token", "UNAUTHORIZED"));
  }
  const token = h.slice("Bearer ".length).trim();
  try {
    const { sub, role } = verifyAccessToken(token);
    req.auth = { userId: sub, role };
    const user = await loadUserForAccess(sub);
    if (!user) {
      return next(new AppError(401, "User not found", "UNAUTHORIZED"));
    }
    assertHierarchyEnabled(user);
    req.dbUser = user as DbUser;
    next();
  } catch {
    return next(new AppError(401, "Invalid token", "UNAUTHORIZED"));
  }
}

export function requireRoles(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }
    if (!roles.includes(req.dbUser.role)) {
      return next(new AppError(403, "Forbidden", "FORBIDDEN_ROLE"));
    }
    next();
  };
}

export function requireSuperNational(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  if (!req.dbUser || req.dbUser.role !== "NATIONAL_ADMIN") {
    return next(new AppError(403, "Forbidden", "FORBIDDEN_ROLE"));
  }
  if (!req.dbUser.isSuperNational) {
    return next(
      new AppError(403, "Super national permission required", "FORBIDDEN_SUPER")
    );
  }
  next();
}
