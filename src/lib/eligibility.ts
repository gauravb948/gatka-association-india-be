import type { CompetitionLevel, Gender } from "@prisma/client";
import * as globalSettingsRepository from "../repositories/globalSettings.repository.js";
import * as playerRepository from "../repositories/player.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as attendanceRepository from "../repositories/attendance.repository.js";
import { AppError } from "./errors.js";
import { fitsAgeCategory } from "./age.js";

export async function getAgeAsOfDate(): Promise<Date> {
  const settings = await globalSettingsRepository.findSingleton();
  return settings?.ageCalculationDate ?? new Date();
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

export function playerGenderMatchesCompetition(
  playerGender: Gender,
  competitionGender: Gender
): boolean {
  const map: Record<Gender, Gender[]> = {
    MALE: ["MALE", "BOYS"],
    FEMALE: ["FEMALE", "GIRLS"],
    BOYS: ["BOYS", "MALE"],
    GIRLS: ["GIRLS", "FEMALE"],
  };
  return map[playerGender]?.includes(competitionGender) ?? false;
}

export async function assertParticipationPrerequisite(
  playerUserId: string,
  sessionId: string,
  targetLevel: CompetitionLevel
) {
  if (targetLevel === "DISTRICT") return;
  if (targetLevel === "STATE") {
    const prev = await participationRepository.findFirstDistrictParticipation(
      playerUserId,
      sessionId
    );
    if (!prev) {
      throw new AppError(
        400,
        "Player must participate in a district competition this session",
        "ELIGIBILITY_DISTRICT"
      );
    }
    return;
  }
  if (targetLevel === "NATIONAL") {
    const prev = await participationRepository.findFirstStateParticipation(
      playerUserId,
      sessionId
    );
    if (!prev) {
      throw new AppError(
        400,
        "Player must participate in a state competition this session",
        "ELIGIBILITY_STATE"
      );
    }
  }
}

export async function assertPlayerFitsCompetitionAge(
  playerUserId: string,
  competitionId: string
) {
  const comp = await competitionRepository.findByIdWithAgeCategory(competitionId);
  if (!comp?.ageCategoryId || !comp.ageCategory) return;
  const asOf = await getAgeAsOfDate();
  const profile = await playerRepository.findProfileByUserId(playerUserId);
  if (!profile) throw new AppError(404, "Player profile not found");
  const { ageFrom, ageTo } = comp.ageCategory;
  if (!fitsAgeCategory(profile.dateOfBirth, asOf, ageFrom, ageTo)) {
    throw new AppError(400, "Player age not in competition age category", "AGE_MISMATCH");
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
