import type { User } from "@prisma/client";
import * as userRepository from "../repositories/user.repository.js";
import { AppError } from "./errors.js";
import { EntityStatus } from "@prisma/client";

export async function loadUserForAccess(userId: string) {
  return userRepository.findByIdWithAccessGraph(userId);
}

/** Minimal shape for hierarchy / enablement checks (login + middleware). */
export type UserForHierarchyCheck = {
  isActive: boolean;
  status: EntityStatus;
  role: User["role"];
  stateId: string | null;
  districtId: string | null;
  trainingCenterId: string | null;
  state: { isEnabled: boolean } | null;
  district: { isEnabled: boolean; state: { isEnabled: boolean } } | null;
  trainingCenter: {
    isEnabled: boolean;
    status: EntityStatus;
    district: { isEnabled: boolean; state: { isEnabled: boolean } };
  } | null;
};

export function assertHierarchyEnabled(user: UserForHierarchyCheck) {
  if (!user.isActive) {
    throw new AppError(403, "Account is disabled", "USER_DISABLED");
  }
  if (user.status === EntityStatus.BLOCKED) {
    throw new AppError(403, "Account is blocked", "USER_BLOCKED");
  }
  if (user.status === EntityStatus.REJECTED) {
    throw new AppError(403, "Account is rejected", "USER_REJECTED");
  }

  const userAdminAwaitingRegistration =
    (user.status === EntityStatus.PENDING || user.status === EntityStatus.SUBMITTED);

  if (user.role === "NATIONAL_ADMIN") return;

  if (userAdminAwaitingRegistration) {
    return;
  }

  if (user.stateId && user.state) {
    if (!user.state.isEnabled) {
      throw new AppError(403, "State is disabled", "STATE_DISABLED");
    }
  }
  if (user.districtId && user.district) {
    if (!user.district.isEnabled) {
      throw new AppError(403, "District is disabled", "DISTRICT_DISABLED");
    }
    if (!user.district.state.isEnabled) {
      throw new AppError(403, "State is disabled", "STATE_DISABLED");
    }
  }
  if (user.trainingCenterId && user.trainingCenter) {
    if (!user.trainingCenter.isEnabled || user.trainingCenter.status !== EntityStatus.ACCEPTED) {
      throw new AppError(403, "Training center is disabled", "TC_DISABLED");
    }
    if (!user.trainingCenter.district.isEnabled) {
      throw new AppError(403, "District is disabled", "DISTRICT_DISABLED");
    }
    if (!user.trainingCenter.district.state.isEnabled) {
      throw new AppError(403, "State is disabled", "STATE_DISABLED");
    }
  }
}

export function assertRoles(user: User, allowed: User["role"][]) {
  if (!allowed.includes(user.role)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }
}
