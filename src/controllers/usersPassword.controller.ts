import type { NextFunction, Request, Response } from "express";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "../lib/errors.js";
import { assertActorMayResetPasswordForTarget } from "../lib/hierarchyPasswordReset.js";
import { hierarchyGeoWhere } from "../lib/userListScope.js";
import { hashPassword } from "../lib/password.js";
import { hierarchyResetPasswordSchema } from "../validators/usersPassword.validators.js";

/** Hierarchy-scoped reset: national/state/district/TC admins set password for downstream users only. */
export async function hierarchyResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const actor = req.dbUser!;
    const userId = req.params.userId?.trim();
    if (!userId) {
      throw new AppError(400, "userId is required", "INVALID_USER");
    }
    if (actor.id === userId) {
      throw new AppError(
        400,
        "Use OTP or profile flows to change your own password",
        "CANNOT_RESET_SELF_HERE"
      );
    }

    const body = hierarchyResetPasswordSchema.parse(req.body);
    const target = await userRepository.findByIdRoleOnly(userId);
    if (!target) {
      throw new AppError(404, "User not found");
    }

    assertActorMayResetPasswordForTarget(actor.role, target.role);
    const geo = hierarchyGeoWhere(actor, target.role);
    const inScope = await userRepository.findByIdWithinScope(userId, geo);
    if (!inScope) {
      throw new AppError(
        403,
        "This user is outside your administrative scope",
        "FORBIDDEN_SCOPE"
      );
    }

    const passwordHash = await hashPassword(body.newPassword);
    await userRepository.updatePassword(userId, passwordHash);

    res.json({ userId, ok: true as const });
  } catch (e) {
    next(e);
  }
}
