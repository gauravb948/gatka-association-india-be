import type { CompetitionLevel, Gender } from "@prisma/client";
import * as playerRepository from "../repositories/player.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as attendanceRepository from "../repositories/attendance.repository.js";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { fitsAgeCategory } from "./age.js";

export type CompetitionGeography = {
  states: { stateId: string }[];
  districts: { districtId: string }[];
};

/** If the competition lists districts, the player must be in one of them; else if it lists states, the player must be in one of those states; else no geographic restriction. */
export function playerMatchesCompetitionGeography(
  comp: CompetitionGeography,
  profile: { stateId: string; districtId: string }
): boolean {
  if (comp.districts.length > 0) {
    return comp.districts.some((d) => d.districtId === profile.districtId);
  }
  if (comp.states.length > 0) {
    return comp.states.some((s) => s.stateId === profile.stateId);
  }
  return true;
}

export function assertPlayerInCompetitionGeography(
  comp: CompetitionGeography,
  profile: { stateId: string; districtId: string }
) {
  if (!playerMatchesCompetitionGeography(comp, profile)) {
    throw new AppError(
      400,
      "Player is outside this competition's state/district scope",
      "COMPETITION_GEO_MISMATCH"
    );
  }
}

/** Same rules as competition geography: districts first, then states, else no restriction. */
export function userMatchesCampGeography(
  camp: CompetitionGeography,
  geo: { stateId: string; districtId: string }
): boolean {
  return playerMatchesCompetitionGeography(camp, geo);
}

export function assertUserInCampGeography(
  camp: CompetitionGeography,
  geo: { stateId: string; districtId: string }
) {
  if (!userMatchesCampGeography(camp, geo)) {
    throw new AppError(
      400,
      "You are outside this camp's state/district scope",
      "CAMP_GEO_MISMATCH"
    );
  }
}

export async function assertPlayerActiveForTournament(playerUserId: string) {
  const profile = await playerRepository.findProfileByUserId(playerUserId);
  if (!profile) throw new AppError(404, "Player profile not found");
  if (profile.registrationStatus !== "ACTIVE") {
    throw new AppError(400, "Only active players can participate", "PLAYER_NOT_ACTIVE");
  }
  if (profile.isBlacklisted || profile.tcDisabled) {
    throw new AppError(403, "Player is blocked", "PLAYER_BLOCKED");
  }
  const until = profile.membershipValidUntil;
  if (until && until < new Date()) {
    throw new AppError(400, "Membership expired", "MEMBERSHIP_EXPIRED");
  }
}

function playerMatchesCompetitionGenderOption(
  playerGender: Gender,
  competitionGender: Gender
): boolean {
  if (competitionGender === "OPEN") return true;
  const map: Record<Gender, Gender[]> = {
    MALE: ["MALE", "BOYS"],
    FEMALE: ["FEMALE", "GIRLS"],
    BOYS: ["BOYS", "MALE"],
    GIRLS: ["GIRLS", "FEMALE"],
    OPEN: [],
  };
  return map[playerGender]?.includes(competitionGender) ?? false;
}

/** Player is eligible if they match at least one of the competition's selected genders. */
export function playerGenderMatchesCompetition(
  playerGender: Gender,
  competitionGenders: Gender[]
): boolean {
  if (competitionGenders.length === 0) return false;
  return competitionGenders.some((g) =>
    playerMatchesCompetitionGenderOption(playerGender, g)
  );
}

/** Calendar year (UTC) used as competition “season” (replaces Session for hierarchy rules). */
export function competitionSeasonYear(competitionCreatedAt: Date): number {
  return competitionCreatedAt.getUTCFullYear();
}

/**
 * Upper-level signup requires completing the lower level in the **same calendar year** as this
 * competition’s `createdAt`, with at least one present tournament attendance on that lower competition.
 */
export async function assertParticipationPrerequisite(
  playerUserId: string,
  competitionCreatedAt: Date,
  targetLevel: CompetitionLevel
) {
  const year = competitionSeasonYear(competitionCreatedAt);
  if (targetLevel === "DISTRICT") return;
  if (targetLevel === "STATE") {
    const ok = await participationRepository.hasCompletedCompetitionAtLevel(
      playerUserId,
      year,
      "DISTRICT"
    );
    if (!ok) {
      throw new AppError(
        400,
        "Player must complete a district-level competition in the same calendar year (participation and presence)",
        "ELIGIBILITY_DISTRICT"
      );
    }
    return;
  }
  if (targetLevel === "NATIONAL") {
    const ok = await participationRepository.hasCompletedCompetitionAtLevel(
      playerUserId,
      year,
      "STATE"
    );
    if (!ok) {
      throw new AppError(
        400,
        "Player must complete a state-level competition in the same calendar year (participation and presence)",
        "ELIGIBILITY_STATE"
      );
    }
  }
}

type CompetitionForTournamentAge = NonNullable<
  Awaited<ReturnType<typeof competitionRepository.findByIdForPlayerEligibility>>
>;

/**
 * On `comp.ageTillDate`, the player must match at least one of the competition's age categories when any are linked;
 * otherwise the selected catalog event's age category (event group) is used.
 */
export async function assertPlayerFitsTournamentEventAge(
  playerUserId: string,
  comp: CompetitionForTournamentAge,
  eventId: string
) {
  if (!comp.ageTillDate) return;
  const profile = await playerRepository.findProfileByUserId(playerUserId);
  if (!profile) throw new AppError(404, "Player profile not found");
  if (!profile.dateOfBirth) {
    throw new AppError(
      400,
      "Player date of birth is required for age verification",
      "DOB_REQUIRED"
    );
  }
  const dob = profile.dateOfBirth;
  const asOf = comp.ageTillDate;

  console.log("dob", dob);

  if (comp.ageCategories.length > 0) {
    const ok = comp.ageCategories.some((link) =>
      fitsAgeCategory(dob, asOf, link.ageCategory.ageFrom, link.ageCategory.ageTo)
    );
    if (!ok) {
      throw new AppError(
        400,
        "Player age does not match any of this competition's age categories on the age-as-of date",
        "AGE_MISMATCH"
      );
    }
    return;
  }

  const eventRow = await prisma.event.findFirst({
    where: { id: eventId, isActive: true },
    include: { eventGroup: { include: { ageCategory: true } } },
  });
  if (!eventRow) throw new AppError(400, "Event not found or inactive");
  const ageCat = eventRow.eventGroup.ageCategory;
  if (!ageCat) return;
  if (!fitsAgeCategory(dob, asOf, ageCat.ageFrom, ageCat.ageTo)) {
    throw new AppError(
      400,
      "Player age does not match this event's category on the competition age-as-of date",
      "AGE_MISMATCH"
    );
  }
}

export async function assertAttendanceForCertificate(
  competitionId: string,
  playerUserId: string
) {
  const comp = await competitionRepository.findByIdBasic(competitionId);
  if (!comp) throw new AppError(404, "Competition not found");
  const days = await attendanceRepository.findTournamentPresentForPlayer(
    competitionId,
    playerUserId
  );
  if (days.length === 0) {
    throw new AppError(
      400,
      "Certificate requires tournament attendance",
      "ATTENDANCE_REQUIRED"
    );
  }
}
