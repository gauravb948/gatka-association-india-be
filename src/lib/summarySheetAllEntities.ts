import type { CompetitionLevel, Gender } from "@prisma/client";
import { AppError } from "./errors.js";
import { buildCompetitionEventGroupParticipantsReport } from "./competitionEventGroupParticipantsReport.js";
import type { CompetitionEventGroupParticipantsReport } from "./competitionEventGroupParticipantsReport.js";
import { buildCompetitionEventRegistrationReport } from "./competitionEventRegistrationReport.js";
import type { CompetitionEventRegistrationReport } from "./competitionEventRegistrationReport.js";
import { buildReportPlayerProfileWhere } from "./reportPlayerProfileFilters.js";
import type { DbUser } from "../types/user.js";
import * as aboutUsRepository from "../repositories/aboutUs.repository.js";
import * as districtRepository from "../repositories/district.repository.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";

export type SummarySheetEntityKind = "state" | "district" | "trainingCenter";

export type SummarySheetEntity = {
  id: string;
  name: string;
  kind: SummarySheetEntityKind;
};

export type SummarySheetEntityBundle = {
  entity: SummarySheetEntity;
  registration: CompetitionEventRegistrationReport;
  participants: CompetitionEventGroupParticipantsReport;
};

export type SummarySheetCompetitionMeta = {
  id: string;
  name: string;
  level: CompetitionLevel;
  venue: string | null;
  startDate: Date | null;
  endDate: Date | null;
};

/** Resolve primary state/district for STATE/DISTRICT competitions (same idea as FE). */
export function resolveCompetitionPrimaryGeo(
  comp: {
    states: Array<{ stateId: string }>;
    districts: Array<{ districtId: string }>;
  },
  actor: DbUser
): { stateId: string; districtId: string } {
  const stateId =
    actor.stateId?.trim() ||
    comp.states[0]?.stateId?.trim() ||
    "";
  const districtId =
    actor.districtId?.trim() ||
    comp.districts[0]?.districtId?.trim() ||
    "";
  return { stateId, districtId };
}

export async function resolveSummarySheetEntities(
  level: CompetitionLevel,
  geo: { stateId: string; districtId: string }
): Promise<SummarySheetEntity[]> {
  if (level === "NATIONAL") {
    const states = await stateRepository.findManyPublic();
    return states.map((s) => ({ id: s.id, name: s.name, kind: "state" as const }));
  }

  if (level === "STATE") {
    if (!geo.stateId) {
      throw new AppError(400, "Competition has no state scope for district listing");
    }
    const districts = await districtRepository.findManyPublicByState(geo.stateId);
    return districts.map((d) => ({ id: d.id, name: d.name, kind: "district" as const }));
  }

  if (level === "DISTRICT") {
    if (!geo.districtId) {
      throw new AppError(400, "Competition has no district scope for training center listing");
    }
    const centers = await trainingCenterRepository.findManyPublicByDistrict(geo.districtId);
    return centers.map((c) => ({
      id: c.id,
      name: c.name,
      kind: "trainingCenter" as const,
    }));
  }

  throw new AppError(400, "Unsupported competition level for all-entities report");
}

export async function resolveAssociationTitle(
  level: CompetitionLevel,
  stateId: string
): Promise<string> {
  if (level === "NATIONAL") return "Gatka Federation of India";
  if (!stateId) return "Gatka Association";

  const about = await aboutUsRepository.findByStateId(stateId);
  const aboutTitle = about?.stateTitle?.trim();
  if (aboutTitle) return aboutTitle;

  const state = await stateRepository.findById(stateId);
  const stateName = state?.name?.trim();
  if (stateName) return `${stateName} Gatka Association`;
  return "Gatka Association";
}

function geoFilterForEntity(entity: SummarySheetEntity): {
  stateId?: string;
  districtId?: string;
  trainingCenterId?: string;
} {
  if (entity.kind === "state") return { stateId: entity.id };
  if (entity.kind === "district") return { districtId: entity.id };
  return { trainingCenterId: entity.id };
}

export async function buildSummarySheetBundlesForEntities(
  actor: DbUser,
  competitionId: string,
  gender: Gender,
  ageAsOf: Date,
  entities: SummarySheetEntity[]
): Promise<SummarySheetEntityBundle[]> {
  const bundles: SummarySheetEntityBundle[] = [];

  for (const entity of entities) {
    const geo = geoFilterForEntity(entity);
    const playerProfileWhere = await buildReportPlayerProfileWhere(actor, {
      gender,
      ...geo,
    });
    const [registration, participants] = await Promise.all([
      buildCompetitionEventRegistrationReport(competitionId, gender, playerProfileWhere),
      buildCompetitionEventGroupParticipantsReport(
        competitionId,
        gender,
        playerProfileWhere,
        ageAsOf
      ),
    ]);
    bundles.push({ entity, registration, participants });
  }

  return bundles;
}
