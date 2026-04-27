import type { CompetitionLevel } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import type { DbUser } from "../types/user.js";

/** Same rules as competition patch/close: who may manage a competition by geography and level. */
export async function assertCanManageCompetition(
  user: DbUser,
  comp: {
    level: CompetitionLevel;
    states: { stateId: string }[];
    districts: { districtId: string }[];
  }
) {
  if (user.role === "NATIONAL_ADMIN") return;
  if (user.role === "STATE_ADMIN") {
    if (comp.level === "NATIONAL") {
      throw new AppError(403, "Cannot manage national competition", "FORBIDDEN_SCOPE");
    }
    if (!user.stateId) throw new AppError(403, "Forbidden");
    if (comp.states.length > 0) {
      if (comp.states.some((s) => s.stateId !== user.stateId)) {
        throw new AppError(403, "Forbidden");
      }
      return;
    }
    if (comp.districts.length > 0) {
      const rows = await prisma.district.findMany({
        where: { id: { in: comp.districts.map((d) => d.districtId) } },
        select: { stateId: true },
      });
      if (rows.some((r) => r.stateId !== user.stateId)) {
        throw new AppError(403, "Forbidden");
      }
      return;
    }
    return;
  }
  if (user.role === "DISTRICT_ADMIN") {
    if (comp.level !== "DISTRICT") throw new AppError(403, "Forbidden");
    if (!user.districtId) throw new AppError(403, "Forbidden");
    if (comp.districts.length === 0) throw new AppError(403, "Forbidden");
    if (comp.districts.some((d) => d.districtId !== user.districtId)) {
      throw new AppError(403, "Forbidden");
    }
    return;
  }
  throw new AppError(403, "Forbidden");
}
