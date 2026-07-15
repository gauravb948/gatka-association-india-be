import type { Gender, Prisma } from "@prisma/client";
import { ageOnDate } from "./age.js";
import { formatEventGroupTitle } from "./competitionResultList.js";
import * as competitionRepository from "../repositories/competition.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";

export type CompetitionEventGroupParticipantRow = {
  name: string;
  fatherName: string | null;
  motherName: string | null;
  dob: string;
  age: number;
  aadharNumber: string | null;
  photoUrl: string | null;
  participatingIn: string[];
};

export type CompetitionEventGroupParticipantsGroups = Record<
  string,
  CompetitionEventGroupParticipantRow[]
>;

export type CompetitionEventGroupParticipantsReport = {
  totalParticipants: number;
  totalEventsPlayed: number;
  groups: CompetitionEventGroupParticipantsGroups;
};

const EMPTY_REPORT: CompetitionEventGroupParticipantsReport = {
  totalParticipants: 0,
  totalEventsPlayed: 0,
  groups: {},
};

function formatDobMmDdYyyy(dateOfBirth: Date): string {
  const mm = String(dateOfBirth.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dateOfBirth.getUTCDate()).padStart(2, "0");
  const yyyy = dateOfBirth.getUTCFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function mapProfileToRow(
  profile: {
    fullName: string;
    fatherName: string | null;
    motherName: string | null;
    dateOfBirth: Date;
    aadharNumber: string | null;
    photoUrl: string | null;
  },
  ageAsOf: Date,
  participatingIn: string[]
): CompetitionEventGroupParticipantRow {
  return {
    name: profile.fullName,
    fatherName: profile.fatherName,
    motherName: profile.motherName,
    dob: formatDobMmDdYyyy(profile.dateOfBirth),
    age: ageOnDate(profile.dateOfBirth, ageAsOf),
    aadharNumber: profile.aadharNumber,
    photoUrl: profile.photoUrl,
    participatingIn,
  };
}

export async function buildCompetitionEventGroupParticipantsReport(
  competitionId: string,
  gender: Gender | undefined,
  playerProfileWhere: Prisma.PlayerProfileWhereInput,
  ageAsOf: Date
): Promise<CompetitionEventGroupParticipantsReport> {
  const groups = await competitionRepository.findEventGroupsInCompetitionAgeScope(competitionId);
  if (!groups) return EMPTY_REPORT;

  const filteredGroups = gender ? groups.filter((g) => g.gender === gender) : groups;
  if (filteredGroups.length === 0) return EMPTY_REPORT;

  const groupIds = filteredGroups.map((g) => g.id);
  const rows = await participationRepository.findParticipationsForEventGroupParticipantsReport(
    competitionId,
    groupIds,
    playerProfileWhere
  );

  const result: CompetitionEventGroupParticipantsGroups = {};
  for (const group of filteredGroups) {
    result[formatEventGroupTitle(group.segment, group.gender, group.ageCategory)] = [];
  }

  const allPlayerIds = new Set<string>();
  const allEventIds = new Set<string>();
  const byGroup = new Map<
    string,
    Map<string, { profile: NonNullable<(typeof rows)[number]["playerUser"]["playerProfile"]>; events: Set<string> }>
  >();
  for (const row of rows) {
    const profile = row.playerUser.playerProfile;
    const event = row.event;
    if (!profile || !event?.eventGroup?.ageCategory || !event.name) continue;

    allPlayerIds.add(row.playerUserId);
    allEventIds.add(event.id);

    const label = formatEventGroupTitle(
      event.eventGroup.segment,
      event.eventGroup.gender,
      event.eventGroup.ageCategory
    );
    let players = byGroup.get(label);
    if (!players) {
      players = new Map();
      byGroup.set(label, players);
    }
    let entry = players.get(row.playerUserId);
    if (!entry) {
      entry = { profile, events: new Set() };
      players.set(row.playerUserId, entry);
    }
    entry.events.add(event.name);
  }

  for (const [label, players] of byGroup) {
    result[label] = [...players.values()]
      .map(({ profile, events }) =>
        mapProfileToRow(profile, ageAsOf, [...events].sort((a, b) => a.localeCompare(b)))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  return {
    totalParticipants: allPlayerIds.size,
    totalEventsPlayed: allEventIds.size,
    groups: result,
  };
}
