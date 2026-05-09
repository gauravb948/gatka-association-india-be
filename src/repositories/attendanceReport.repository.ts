import type { Attendance, Prisma } from "@prisma/client";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import * as participationRepository from "./participation.repository.js";

const userReportSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  playerProfile: {
    select: {
      fullName: true,
      registrationNumber: true,
      gender: true,
      photoUrl: true,
      trainingCenterId: true,
      trainingCenter: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserSelect;

type ReportUser = Prisma.UserGetPayload<{ select: typeof userReportSelect }>;

function parseDayUtc(dateYmd: string): Date {
  return new Date(dateYmd + "T12:00:00.000Z");
}

function isPlayer(user: { role: Role }): boolean {
  return user.role === Role.PLAYER;
}

export type AttendanceUserRow = {
  user: ReportUser;
  attendance: Attendance | null;
  /** true when the row counts as "present" for this report’s scope */
  isPresent: boolean;
};

/**
 * All players in the TC, split by who has TC_DAILY+tcId+present for that date vs everyone else in the TC.
 * Other same-day attendance (e.g. tournament) is still returned on the row for context.
 */
export async function reportTrainingCenterDay(
  trainingCenterId: string,
  dateYmd: string
): Promise<{
  trainingCenterId: string;
  date: string;
  present: AttendanceUserRow[];
  absent: AttendanceUserRow[];
}> {
  const date = parseDayUtc(dateYmd);
  const users = await prisma.user.findMany({
    where: {
      role: Role.PLAYER,
      status: "ACCEPTED",
      playerProfile: { trainingCenterId, tcDisabled: false, isBlacklisted: false },
    },
    orderBy: { id: "asc" },
    select: userReportSelect,
  });
  const playerUsers = users.filter(isPlayer);
  if (playerUsers.length === 0) {
    return { trainingCenterId, date: dateYmd, present: [], absent: [] };
  }
  const ids = playerUsers.map((u) => u.id);
  const rows = await prisma.attendance.findMany({
    where: { userId: { in: ids }, date },
  });
  const byUser = new Map(rows.map((a) => [a.userId, a]));

  const present: AttendanceUserRow[] = [];
  const absent: AttendanceUserRow[] = [];
  for (const user of playerUsers) {
    const att = byUser.get(user.id) ?? null;
    const isPresent = !!(
      att &&
      att.type === "TC_DAILY" &&
      att.trainingCenterId === trainingCenterId &&
      att.present
    );
    const entry: AttendanceUserRow = { user, attendance: att, isPresent: isPresent };
    if (isPresent) present.push(entry);
    else absent.push({ ...entry, isPresent: false });
  }
  return { trainingCenterId, date: dateYmd, present, absent };
}

/**
 * All players who have participation in the competition (optionally a single event),
 * split into present / absent for tournament attendance on this competition.
 * If `dateYmd` is set, a player is "present" only for that calendar day. Otherwise, present if
 * they have any TOURNAMENT+competitionId row with `present: true`.
 */
export async function reportCompetition(
  competitionId: string,
  opts: { eventId?: string; dateYmd?: string }
): Promise<{
  competitionId: string;
  eventId: string | null;
  date: string | null;
  present: (AttendanceUserRow & { participations: { id: string; eventId: string | null; eventName: string | null }[] })[];
  absent: (AttendanceUserRow & { participations: { id: string; eventId: string | null; eventName: string | null }[] })[];
}> {
  const { eventId, dateYmd } = opts;
  const date = dateYmd ? parseDayUtc(dateYmd) : null;

  let playerIds: string[];
  if (eventId) {
    const set = await participationRepository.findPlayerUserIdsParticipatedInEvent(
      competitionId,
      eventId
    );
    playerIds = [...set];
  } else {
    playerIds = await participationRepository.findParticipatedPlayerIds(competitionId);
  }

  if (playerIds.length === 0) {
    return {
      competitionId,
      eventId: eventId ?? null,
      date: dateYmd ?? null,
      present: [],
      absent: [],
    };
  }

  const users = await prisma.user.findMany({
    where: { id: { in: playerIds } },
    orderBy: { id: "asc" },
    select: userReportSelect,
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const partRows = await prisma.participationRecord.findMany({
    where: {
      competitionId,
      playerUserId: { in: playerIds },
      participated: true,
      ...(eventId ? { eventId } : {}),
    },
    include: {
      event: { select: { id: true, name: true } },
    },
  });
  const partsByUser = new Map<string, { id: string; eventId: string | null; eventName: string | null }[]>();
  for (const p of partRows) {
    const list = partsByUser.get(p.playerUserId) ?? [];
    list.push({
      id: p.id,
      eventId: p.eventId,
      eventName: p.event?.name ?? null,
    });
    partsByUser.set(p.playerUserId, list);
  }

  const tournamentWhere: Prisma.AttendanceWhereInput = {
    competitionId,
    type: "TOURNAMENT",
    userId: { in: playerIds },
    ...(date ? { date } : {}),
  };
  const attRows = await prisma.attendance.findMany({ where: tournamentWhere });
  const attByUser = new Map<string, Attendance[]>();
  for (const a of attRows) {
    const list = attByUser.get(a.userId) ?? [];
    list.push(a);
    attByUser.set(a.userId, list);
  }

  const present: (AttendanceUserRow & {
    participations: { id: string; eventId: string | null; eventName: string | null }[];
  })[] = [];
  const absent: (AttendanceUserRow & {
    participations: { id: string; eventId: string | null; eventName: string | null }[];
  })[] = [];

  for (const playerUserId of playerIds) {
    const user = userById.get(playerUserId);
    if (!user || !isPlayer(user)) continue;
    const participations = partsByUser.get(playerUserId) ?? [];
    const atts = attByUser.get(playerUserId) ?? [];

    let isPresent: boolean;
    let attendanceForResponse: Attendance | null;
    if (date) {
      const one = atts[0] ?? null;
      attendanceForResponse = one;
      isPresent = !!(one && one.present);
    } else {
      attendanceForResponse = atts.find((a) => a.present) ?? atts[0] ?? null;
      isPresent = atts.some((a) => a.present);
    }

    const row: AttendanceUserRow & {
      participations: { id: string; eventId: string | null; eventName: string | null }[];
    } = {
      user,
      attendance: attendanceForResponse,
      isPresent,
      participations,
    };
    if (isPresent) present.push(row);
    else
      absent.push({
        user,
        attendance: attendanceForResponse,
        isPresent: false,
        participations,
      });
  }

  return {
    competitionId,
    eventId: eventId ?? null,
    date: dateYmd ?? null,
    present,
    absent,
  };
}

/**
 * Registered camp users (players), split by CAMP+present for this camp on a given day,
 * or (no date) any day with a present CAMP mark for this camp.
 */
export async function reportCamp(
  campId: string,
  dateYmd?: string
): Promise<{
  campId: string;
  date: string | null;
  present: AttendanceUserRow[];
  absent: AttendanceUserRow[];
}> {
  const regs = await prisma.campRegistration.findMany({
    where: { campId },
    include: {
      user: { select: userReportSelect },
    },
  });
  const playerRegs = regs.filter((r) => r.user && isPlayer(r.user));
  if (playerRegs.length === 0) {
    return { campId, date: dateYmd ?? null, present: [], absent: [] };
  }
  const userIds = playerRegs.map((r) => r.userId);
  const users = playerRegs
    .map((r) => r.user)
    .filter((u): u is NonNullable<typeof u> => u !== null) as ReportUser[];

  let attRows: Attendance[];
  if (dateYmd) {
    const d = parseDayUtc(dateYmd);
    attRows = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        date: d,
        type: "CAMP",
        campId,
      },
    });
  } else {
    attRows = await prisma.attendance.findMany({
      where: {
        userId: { in: userIds },
        type: "CAMP",
        campId,
      },
    });
  }
  const byUser = new Map<string, Attendance[]>();
  for (const a of attRows) {
    const list = byUser.get(a.userId) ?? [];
    list.push(a);
    byUser.set(a.userId, list);
  }

  const present: AttendanceUserRow[] = [];
  const absent: AttendanceUserRow[] = [];
  for (const user of users) {
    if (!isPlayer(user)) continue;
    const atts = byUser.get(user.id) ?? [];
    let isPresent: boolean;
    let attendance: Attendance | null;
    if (dateYmd) {
      attendance = atts[0] ?? null;
      isPresent = !!(attendance && attendance.present);
    } else {
      isPresent = atts.some((a) => a.present);
      attendance = atts.find((a) => a.present) ?? atts[0] ?? null;
    }
    const entry: AttendanceUserRow = { user, attendance, isPresent };
    if (isPresent) present.push(entry);
    else absent.push({ ...entry, isPresent: false });
  }
  return { campId, date: dateYmd ?? null, present, absent };
}
