import type { Prisma } from "@prisma/client";
import type { DbUser } from "../types/user.js";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { actorPlayerProfileScopeWhere } from "./competitionParticipation.js";

export type ExportGeoFilters = {
  stateId?: string;
  districtId?: string;
  trainingCenterId?: string;
};

export type ResolvedExportFilters = {
  /** Actor scope AND the requested geography — pass to the export builders as `playerProfileWhere`. */
  playerProfileWhere: Prisma.PlayerProfileWhereInput;
  /** Names of the selected levels, in State → District → TC order (for filenames). */
  labels: string[];
};

function invalid(message: string): never {
  throw new AppError(400, message, "INVALID_GEO_FILTER");
}

/**
 * Validates the State → District → TC chain, checks it is inside the actor's own geography,
 * and returns the profile filter. The actor scope is always ANDed in, so a filter can only
 * narrow what the role may already see.
 */
export async function resolveExportPlayerProfileWhere(
  actor: DbUser,
  filters: ExportGeoFilters
): Promise<ResolvedExportFilters> {
  const scope = actorPlayerProfileScopeWhere(actor);
  let { stateId, districtId, trainingCenterId } = filters;
  const labels: string[] = [];

  if (trainingCenterId) {
    const tc = await prisma.trainingCenter.findFirst({
      where: { id: trainingCenterId, deletedAt: null },
      select: { name: true, districtId: true, district: { select: { name: true, stateId: true, state: { select: { name: true } } } } },
    });
    if (!tc) invalid("Training center not found");
    if (districtId && districtId !== tc.districtId) invalid("Training center does not belong to the selected district");
    if (stateId && stateId !== tc.district.stateId) invalid("Training center does not belong to the selected state");
    districtId = tc.districtId;
    stateId = tc.district.stateId;
    labels.push(tc.district.state.name, tc.district.name, tc.name);
  } else if (districtId) {
    const district = await prisma.district.findFirst({
      where: { id: districtId, deletedAt: null },
      select: { name: true, stateId: true, state: { select: { name: true } } },
    });
    if (!district) invalid("District not found");
    if (stateId && stateId !== district.stateId) invalid("District does not belong to the selected state");
    stateId = district.stateId;
    labels.push(district.state.name, district.name);
  } else if (stateId) {
    const state = await prisma.state.findUnique({ where: { id: stateId }, select: { name: true } });
    if (!state) invalid("State not found");
    labels.push(state.name);
  }

  if (actor.role === "STATE_ADMIN" && stateId && stateId !== actor.stateId) {
    throw new AppError(403, "State is outside your scope", "FORBIDDEN_SCOPE");
  }
  if (actor.role === "DISTRICT_ADMIN") {
    if (districtId && districtId !== actor.districtId) {
      throw new AppError(403, "District is outside your scope", "FORBIDDEN_SCOPE");
    }
    if (!districtId && stateId && stateId !== actor.stateId) {
      throw new AppError(403, "State is outside your scope", "FORBIDDEN_SCOPE");
    }
  }

  const geo: Prisma.PlayerProfileWhereInput = {
    ...(stateId ? { stateId } : {}),
    ...(districtId ? { districtId } : {}),
    ...(trainingCenterId ? { trainingCenterId } : {}),
  };
  return { playerProfileWhere: { AND: [scope, geo] }, labels };
}

/** Distinct State → District → TC tree of the players who took part, limited to the actor's scope. */
export type ExportGeoTree = Array<{
  id: string;
  name: string;
  districts: Array<{ id: string; name: string; trainingCenters: Array<{ id: string; name: string }> }>;
}>;

export async function buildExportGeoTree(
  actor: DbUser,
  competitionId: string
): Promise<ExportGeoTree> {
  const profiles = await prisma.playerProfile.findMany({
    where: {
      AND: [
        actorPlayerProfileScopeWhere(actor),
        { user: { participations: { some: { competitionId, participated: true } } } },
      ],
    },
    distinct: ["trainingCenterId"],
    select: {
      state: { select: { id: true, name: true } },
      district: { select: { id: true, name: true } },
      trainingCenter: { select: { id: true, name: true } },
    },
  });

  const states = new Map<
    string,
    { id: string; name: string; districts: Map<string, { id: string; name: string; trainingCenters: Map<string, { id: string; name: string }> }> }
  >();
  for (const p of profiles) {
    let state = states.get(p.state.id);
    if (!state) {
      state = { ...p.state, districts: new Map() };
      states.set(p.state.id, state);
    }
    let district = state.districts.get(p.district.id);
    if (!district) {
      district = { ...p.district, trainingCenters: new Map() };
      state.districts.set(p.district.id, district);
    }
    district.trainingCenters.set(p.trainingCenter.id, p.trainingCenter);
  }

  const byName = <T extends { name: string }>(a: T, b: T) => a.name.localeCompare(b.name);
  return [...states.values()].sort(byName).map((s) => ({
    id: s.id,
    name: s.name,
    districts: [...s.districts.values()].sort(byName).map((d) => ({
      id: d.id,
      name: d.name,
      trainingCenters: [...d.trainingCenters.values()].sort(byName),
    })),
  }));
}

/** ASCII-safe filename fragment, e.g. "Punjab - Ludhiana" -> "punjab-ludhiana". */
export function filenameSlug(parts: string[]): string {
  return parts
    .join("-")
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
