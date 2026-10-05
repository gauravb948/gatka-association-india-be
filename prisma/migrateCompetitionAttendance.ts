import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LegacyGroup = {
  userId: string;
  competitionId: string;
  present: boolean;
  markedById: string;
  notes: string | null;
};

/**
 * One-off backfill: legacy `Attendance` rows with `type = 'TOURNAMENT'` had no
 * `eventId` (the field was never accepted by the old validator, so it was always
 * dropped before persisting) and one row per calendar day. The new
 * `CompetitionAttendance` table is one row per (competitionId, eventId, userId).
 *
 * For each (userId, competitionId) group of legacy rows, this resolves the event
 * via that player's `TournamentRegistration`s for the competition:
 *   - exactly 1 registration  -> that event, unambiguous.
 *   - 0 registrations         -> skipped (can't satisfy the required eventId FK);
 *                                 logged for manual follow-up.
 *   - >1 registrations        -> duplicated across every registered event, since
 *                                 the legacy row can't tell us which one was meant.
 *
 * Safe to re-run: every write is an upsert on the (competitionId, eventId, userId)
 * unique key.
 */
async function main() {
  const legacyRows = await prisma.attendance.findMany({
    where: { type: "TOURNAMENT" },
    orderBy: { createdAt: "asc" },
  });

  const groups = new Map<string, LegacyGroup>();
  for (const row of legacyRows) {
    if (!row.competitionId) continue;
    const key = `${row.userId}:${row.competitionId}`;
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        userId: row.userId,
        competitionId: row.competitionId,
        present: row.present,
        markedById: row.markedById,
        notes: row.notes,
      });
    } else if (row.present) {
      existing.present = true;
    }
  }

  let migrated1to1 = 0;
  let duplicatedRows = 0;
  let duplicatedGroups = 0;
  const skipped: { userId: string; competitionId: string }[] = [];

  for (const group of groups.values()) {
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { competitionId: group.competitionId, playerUserId: group.userId },
      select: { eventId: true },
    });

    if (registrations.length === 0) {
      skipped.push({ userId: group.userId, competitionId: group.competitionId });
      continue;
    }

    for (const reg of registrations) {
      await prisma.competitionAttendance.upsert({
        where: {
          competitionId_eventId_userId: {
            competitionId: group.competitionId,
            eventId: reg.eventId,
            userId: group.userId,
          },
        },
        create: {
          competitionId: group.competitionId,
          eventId: reg.eventId,
          userId: group.userId,
          markedById: group.markedById,
          present: group.present,
          notes: group.notes ?? undefined,
        },
        update: {
          present: group.present,
          markedById: group.markedById,
          notes: group.notes,
        },
      });
    }

    if (registrations.length === 1) {
      migrated1to1 += 1;
    } else {
      duplicatedGroups += 1;
      duplicatedRows += registrations.length;
    }
  }

  console.log({
    legacyTournamentRows: legacyRows.length,
    legacyGroups: groups.size,
    migrated1to1,
    duplicatedGroups,
    duplicatedRowsWritten: duplicatedRows,
    skipped: skipped.length,
  });
  if (skipped.length > 0) {
    console.log("Skipped (no TournamentRegistration found — needs manual review):");
    for (const s of skipped) {
      console.log(`  userId=${s.userId} competitionId=${s.competitionId}`);
    }
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
