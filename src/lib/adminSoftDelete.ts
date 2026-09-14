import { Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { AppError } from "./errors.js";
import { findBlockingCompetitionsByPlayerUserId } from "../repositories/migration.repository.js";

export const DELETED_BY_NATIONAL_ADMIN = "Deleted by national admin";

export const notDeleted = { deletedAt: null } as const;

const SOFT_DELETE_PEOPLE_ROLES = ["PLAYER", "COACH", "VOLUNTEER"] as const;
type SoftDeletePeopleRole = (typeof SOFT_DELETE_PEOPLE_ROLES)[number];

function startOfTodayUtc() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function formatCountLabel(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

function joinCountLabels(labels: string[]) {
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

function throwBlocked(message: string): never {
  throw new AppError(400, message, "SOFT_DELETE_BLOCKED");
}

export function formatTrainingCenterDeleteBlockedMessage(players: number, coaches: number) {
  const labels: string[] = [];
  if (players > 0) labels.push(formatCountLabel(players, "player", "players"));
  if (coaches > 0) labels.push(formatCountLabel(coaches, "coach", "coaches"));
  return `Cannot delete this training center: ${joinCountLabels(labels)} are still assigned. Migrate or delete them first.`;
}

export function formatDistrictDeleteBlockedMessage(counts: {
  trainingCenters: number;
  players: number;
  coaches: number;
  volunteers: number;
  districtAdmins: number;
}) {
  const labels: string[] = [];
  if (counts.trainingCenters > 0) {
    labels.push(formatCountLabel(counts.trainingCenters, "training center", "training centers"));
  }
  if (counts.players > 0) labels.push(formatCountLabel(counts.players, "player", "players"));
  if (counts.coaches > 0) labels.push(formatCountLabel(counts.coaches, "coach", "coaches"));
  if (counts.volunteers > 0) labels.push(formatCountLabel(counts.volunteers, "volunteer", "volunteers"));
  if (counts.districtAdmins > 0) {
    labels.push(formatCountLabel(counts.districtAdmins, "district admin", "district admins"));
  }
  return `Cannot delete this district: ${joinCountLabels(labels)} are still assigned. Migrate or delete them first.`;
}

export function formatStateDeleteBlockedMessage(counts: {
  districts: number;
  players: number;
  coaches: number;
  volunteers: number;
  otherUsers: number;
}) {
  const labels: string[] = [];
  if (counts.districts > 0) labels.push(formatCountLabel(counts.districts, "district", "districts"));
  if (counts.players > 0) labels.push(formatCountLabel(counts.players, "player", "players"));
  if (counts.coaches > 0) labels.push(formatCountLabel(counts.coaches, "coach", "coaches"));
  if (counts.volunteers > 0) labels.push(formatCountLabel(counts.volunteers, "volunteer", "volunteers"));
  if (counts.otherUsers > 0) labels.push(formatCountLabel(counts.otherUsers, "other user", "other users"));
  return `Cannot delete this state: ${joinCountLabels(labels)} are still assigned. Migrate or delete them first.`;
}

export function formatPersonCompetitionDeleteBlockedMessage(name: string, eventNames: string[]) {
  return `Cannot delete ${name}: registered in upcoming/ongoing competition(s): ${eventNames.join(", ")}. Unregister them first, then try again.`;
}

async function findBlockingOpenEventNamesByUserId(userId: string): Promise<string[]> {
  const upcomingOrOngoingCamp = { endDate: { gte: startOfTodayUtc() } };
  const [compsByUser, campRegs] = await Promise.all([
    findBlockingCompetitionsByPlayerUserId([userId]),
    prisma.campRegistration.findMany({
      where: {
        userId,
        camp: upcomingOrOngoingCamp,
      },
      select: { camp: { select: { id: true, name: true } } },
    }),
  ]);
  const names = new Map<string, string>();
  for (const c of compsByUser.get(userId) ?? []) {
    names.set(`competition:${c.id}`, c.name);
  }
  for (const row of campRegs) {
    names.set(`camp:${row.camp.id}`, row.camp.name);
  }
  return [...names.values()];
}

export async function countLiveTrainingCenterChildren(trainingCenterId: string) {
  const liveUser = { deletedAt: null };
  const [players, coaches] = await prisma.$transaction([
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.PLAYER,
        OR: [{ trainingCenterId }, { playerProfile: { trainingCenterId } }],
      },
    }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.COACH,
        OR: [{ trainingCenterId }, { coachProfile: { trainingCenterId } }],
      },
    }),
  ]);
  return { players, coaches };
}

export async function countLiveDistrictChildren(districtId: string) {
  const liveUser = { deletedAt: null };
  const [trainingCenters, players, coaches, volunteers, districtAdmins] = await prisma.$transaction([
    prisma.trainingCenter.count({ where: { districtId, deletedAt: null } }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.PLAYER,
        OR: [{ districtId }, { playerProfile: { districtId } }],
      },
    }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.COACH,
        OR: [{ districtId }, { coachProfile: { trainingCenter: { districtId } } }],
      },
    }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.VOLUNTEER,
        OR: [{ districtId }, { volunteerProfile: { districtId } }],
      },
    }),
    prisma.user.count({
      where: { ...liveUser, role: Role.DISTRICT_ADMIN, districtId },
    }),
  ]);
  return { trainingCenters, players, coaches, volunteers, districtAdmins };
}

export async function countLiveStateChildren(stateId: string) {
  const liveUser = { deletedAt: null };
  const [districts, players, coaches, volunteers, allLiveUsers] = await prisma.$transaction([
    prisma.district.count({ where: { stateId, deletedAt: null } }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.PLAYER,
        OR: [{ stateId }, { playerProfile: { stateId } }],
      },
    }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.COACH,
        OR: [{ stateId }, { coachProfile: { trainingCenter: { district: { stateId } } } }],
      },
    }),
    prisma.user.count({
      where: {
        ...liveUser,
        role: Role.VOLUNTEER,
        OR: [{ stateId }, { volunteerProfile: { stateId } }],
      },
    }),
    prisma.user.count({
      where: {
        ...liveUser,
        OR: [
          { stateId },
          { playerProfile: { stateId } },
          { volunteerProfile: { stateId } },
          { refereeProfile: { stateId } },
          { coachProfile: { trainingCenter: { district: { stateId } } } },
        ],
      },
    }),
  ]);
  const countedPeople = players + coaches + volunteers;
  const otherUsers = Math.max(0, allLiveUsers - countedPeople);
  return { districts, players, coaches, volunteers, otherUsers };
}

function peopleSoftDeleteData(now: Date) {
  return {
    deletedAt: now,
    isActive: false,
    disabledReason: DELETED_BY_NATIONAL_ADMIN,
  };
}

export async function softDeletePersonByNationalAdmin(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      deletedAt: true,
      playerProfile: { select: { fullName: true } },
      coachProfile: { select: { fullName: true } },
      volunteerProfile: { select: { fullName: true } },
    },
  });
  if (!user || user.deletedAt) {
    throw new AppError(404, "User not found");
  }
  if (!SOFT_DELETE_PEOPLE_ROLES.includes(user.role as SoftDeletePeopleRole)) {
    throw new AppError(400, "Only players, coaches, and volunteers can be deleted this way");
  }

  const name =
    user.playerProfile?.fullName?.trim() ||
    user.coachProfile?.fullName?.trim() ||
    user.volunteerProfile?.fullName?.trim() ||
    user.email;

  const blockingNames = await findBlockingOpenEventNamesByUserId(user.id);
  if (blockingNames.length > 0) {
    throwBlocked(formatPersonCompetitionDeleteBlockedMessage(name, blockingNames));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: peopleSoftDeleteData(new Date()),
  });
}

export async function softDeleteTrainingCenterByNationalAdmin(trainingCenterId: string) {
  const existing = await prisma.trainingCenter.findUnique({
    where: { id: trainingCenterId },
    select: { id: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, "Training center not found");
  }

  const children = await countLiveTrainingCenterChildren(trainingCenterId);
  if (children.players > 0 || children.coaches > 0) {
    throwBlocked(formatTrainingCenterDeleteBlockedMessage(children.players, children.coaches));
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.trainingCenter.update({
      where: { id: trainingCenterId },
      data: { deletedAt: now, isEnabled: false },
    }),
    prisma.user.updateMany({
      where: { trainingCenterId, role: Role.TRAINING_CENTER, deletedAt: null },
      data: peopleSoftDeleteData(now),
    }),
  ]);
}

export async function softDeleteDistrictByNationalAdmin(districtId: string) {
  const existing = await prisma.district.findUnique({
    where: { id: districtId },
    select: { id: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, "District not found");
  }

  const children = await countLiveDistrictChildren(districtId);
  if (
    children.trainingCenters > 0 ||
    children.players > 0 ||
    children.coaches > 0 ||
    children.volunteers > 0 ||
    children.districtAdmins > 0
  ) {
    throwBlocked(formatDistrictDeleteBlockedMessage(children));
  }

  await prisma.district.update({
    where: { id: districtId },
    data: { deletedAt: new Date(), isEnabled: false },
  });
}

export async function softDeleteStateByNationalAdmin(stateId: string) {
  const existing = await prisma.state.findUnique({
    where: { id: stateId },
    select: { id: true, deletedAt: true },
  });
  if (!existing || existing.deletedAt) {
    throw new AppError(404, "State not found");
  }

  const children = await countLiveStateChildren(stateId);
  if (
    children.districts > 0 ||
    children.players > 0 ||
    children.coaches > 0 ||
    children.volunteers > 0 ||
    children.otherUsers > 0
  ) {
    throwBlocked(formatStateDeleteBlockedMessage(children));
  }

  await prisma.state.update({
    where: { id: stateId },
    data: { deletedAt: new Date(), isEnabled: false },
  });
}
