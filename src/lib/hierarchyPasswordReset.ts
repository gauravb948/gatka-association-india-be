import type { Role } from "@prisma/client";
import { AppError } from "./errors.js";

/**
 * Roles an actor may set a password for (strict hierarchy: excludes peers/admins above the actor).
 * Geographic scope still enforced separately via {@link hierarchyGeoWhere}.
 */
const RESET_PASSWORD_TARGETS: Record<
  "NATIONAL_ADMIN" | "STATE_ADMIN" | "DISTRICT_ADMIN" | "TRAINING_CENTER",
  readonly Role[]
> = {
  NATIONAL_ADMIN: [
    "PLAYER",
    "COACH",
    "REFEREE",
    "VOLUNTEER",
    "TRAINING_CENTER",
    "DISTRICT_ADMIN",
    "STATE_ADMIN",
  ],
  STATE_ADMIN: ["PLAYER", "COACH", "REFEREE", "VOLUNTEER", "TRAINING_CENTER", "DISTRICT_ADMIN"],
  DISTRICT_ADMIN: ["PLAYER", "COACH", "REFEREE", "VOLUNTEER", "TRAINING_CENTER"],
  TRAINING_CENTER: ["PLAYER", "COACH"],
};

export function assertActorMayResetPasswordForTarget(actorRole: Role, targetRole: Role) {
  const allowed =
    RESET_PASSWORD_TARGETS[actorRole as keyof typeof RESET_PASSWORD_TARGETS];
  if (!allowed) {
    throw new AppError(403, "Your role cannot reset other users passwords", "FORBIDDEN_ROLE");
  }
  if (!allowed.includes(targetRole)) {
    throw new AppError(403, "You cannot reset password for this user role", "FORBIDDEN_TARGET_ROLE");
  }
}
