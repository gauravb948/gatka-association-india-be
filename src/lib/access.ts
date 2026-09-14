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
  deletedAt?: Date | null;
  status: EntityStatus;
  role: User["role"];
  stateId: string | null;
  districtId: string | null;
  trainingCenterId: string | null;
  state: { isEnabled: boolean; deletedAt?: Date | null } | null;
  district: {
    isEnabled: boolean;
    deletedAt?: Date | null;
    state: { isEnabled: boolean; deletedAt?: Date | null };
  } | null;
  trainingCenter: {
    isEnabled: boolean;
    deletedAt?: Date | null;
    status: EntityStatus;
    district: {
      isEnabled: boolean;
      deletedAt?: Date | null;
      state: { isEnabled: boolean; deletedAt?: Date | null };
    };
  } | null;
};

export function assertHierarchyEnabled(user: UserForHierarchyCheck) {
  if (!user.isActive || user.deletedAt) {
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
    if (!user.state.isEnabled || user.state.deletedAt) {
      throw new AppError(403, "State is disabled", "STATE_DISABLED");
    }
  }
  if (user.districtId && user.district) {
    if (!user.district.isEnabled || user.district.deletedAt) {
      throw new AppError(403, "District is disabled", "DISTRICT_DISABLED");
    }
    if (!user.district.state.isEnabled || user.district.state.deletedAt) {
      throw new AppError(403, "State is disabled", "STATE_DISABLED");
    }
  }
  if (user.trainingCenterId && user.trainingCenter) {
    if (
      !user.trainingCenter.isEnabled ||
      user.trainingCenter.deletedAt ||
      user.trainingCenter.status !== EntityStatus.ACCEPTED
    ) {
      throw new AppError(403, "Training center is disabled", "TC_DISABLED");
    }
    if (!user.trainingCenter.district.isEnabled || user.trainingCenter.district.deletedAt) {
      throw new AppError(403, "District is disabled", "DISTRICT_DISABLED");
    }
    if (
      !user.trainingCenter.district.state.isEnabled ||
      user.trainingCenter.district.state.deletedAt
    ) {
      throw new AppError(403, "State is disabled", "STATE_DISABLED");
    }
  }
}

export function assertRoles(user: User, allowed: User["role"][]) {
  if (!allowed.includes(user.role)) {
    throw new AppError(403, "Forbidden", "FORBIDDEN_ROLE");
  }
}
