import type { Role } from "@prisma/client";
import { AppError } from "./errors.js";
import type { DbUser } from "../types/user.js";

const roleRank: Record<Role, number> = {
  NATIONAL_ADMIN: 5,
  STATE_ADMIN: 4,
  DISTRICT_ADMIN: 3,
  TRAINING_CENTER: 2,
  PLAYER: 1,
  COACH: 1,
  VOLUNTEER: 1,
  REFEREE: 1,
};

export type ManualPaymentTarget = {
  role: Role;
  stateId: string | null;
  districtId: string | null;
  trainingCenterId: string | null;
  district?: { id: string; stateId?: string; state?: { id: string } | null } | null;
  trainingCenter?: {
    id: string;
    districtId?: string;
    district?: { id: string; stateId?: string; state?: { id: string } | null } | null;
  } | null;
};

function targetStateId(target: ManualPaymentTarget, paymentStateId: string): string | null {
  return (
    target.stateId ??
    target.district?.state?.id ??
    target.district?.stateId ??
    target.trainingCenter?.district?.state?.id ??
    target.trainingCenter?.district?.stateId ??
    paymentStateId ??
    null
  );
}

function targetDistrictId(target: ManualPaymentTarget): string | null {
  return target.districtId ?? target.trainingCenter?.district?.id ?? target.trainingCenter?.districtId ?? null;
}

/** True when the actor is a higher role and covers the payer's geography. */
export function canApproveManualPayment(
  actor: DbUser,
  target: ManualPaymentTarget,
  paymentStateId: string
): boolean {
  if (roleRank[actor.role] <= roleRank[target.role]) return false;

  if (actor.role === "NATIONAL_ADMIN") return true;

  if (actor.role === "STATE_ADMIN") {
    const actorState = actor.stateId;
    if (!actorState) return false;
    return targetStateId(target, paymentStateId) === actorState;
  }

  if (actor.role === "DISTRICT_ADMIN") {
    const actorDistrict = actor.districtId;
    if (!actorDistrict) return false;
    const districtId = targetDistrictId(target);
    if (districtId) return districtId === actorDistrict;
    if (target.role === "REFEREE" || target.role === "VOLUNTEER") {
      const actorState = actor.district?.state.id ?? actor.stateId;
      const payerState = targetStateId(target, paymentStateId);
      return Boolean(actorState && payerState && actorState === payerState);
    }
    return false;
  }

  if (actor.role === "TRAINING_CENTER") {
    return Boolean(
      actor.trainingCenterId &&
        target.trainingCenterId === actor.trainingCenterId &&
        ["PLAYER", "COACH", "VOLUNTEER", "REFEREE"].includes(target.role)
    );
  }

  return false;
}

export function assertCanApproveManualPayment(
  actor: DbUser,
  target: ManualPaymentTarget,
  paymentStateId: string
) {
  if (!canApproveManualPayment(actor, target, paymentStateId)) {
    throw new AppError(
      403,
      "Only this user's manager can confirm this payment",
      "FORBIDDEN_HIERARCHY"
    );
  }
}
