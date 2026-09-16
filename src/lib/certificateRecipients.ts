import type { CertificateKind, CompetitionLevel, Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import { aggregateUnitTypeForLevel } from "./competitionAggregateUnits.js";
import {
  defaultCertificateLayout,
  formatCertificateDate,
  rankLabelForBand,
  type CertificateKindQuery,
  type CertificateLayout,
  type CertificateMergeFields,
} from "./certificateLayout.js";
import { certificateLayoutSchema } from "../validators/certificate.validators.js";
import * as certificateTemplateRepository from "../repositories/certificateTemplate.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";

export type CertificateRecipient = {
  playerUserId: string;
  fullName: string;
  unitName: string;
  rankLabel: string;
  competition: string;
  event: string;
  date: string;
};

export type CertificateRecipientsPayload = {
  kind: CertificateKindQuery;
  competition: { id: string; name: string; date: string; venue: string };
  event: { id: string; name: string };
  layout: CertificateLayout;
  recipients: CertificateRecipient[];
};

export function dbKindFromQuery(kind: CertificateKindQuery): CertificateKind {
  return kind === "winners" ? "WINNER" : "PARTICIPANT";
}

export function parseStoredLayout(
  kind: CertificateKindQuery,
  raw: Prisma.JsonValue | null | undefined
): CertificateLayout {
  const parsed = certificateLayoutSchema.safeParse(raw);
  if (parsed.success) {
    return {
      widthMm: 297,
      heightMm: 210,
      backgroundUrl: parsed.data.backgroundUrl ?? null,
      blocks: parsed.data.blocks,
    };
  }
  return defaultCertificateLayout(kind);
}

export async function loadSavedLayout(kind: CertificateKindQuery): Promise<CertificateLayout> {
  const row = await certificateTemplateRepository.findByKind(dbKindFromQuery(kind));
  return parseStoredLayout(kind, row?.layout ?? null);
}

export async function saveLayout(
  kind: CertificateKindQuery,
  layout: CertificateLayout,
  updatedById: string | null
) {
  return certificateTemplateRepository.upsertByKind(
    dbKindFromQuery(kind),
    {
      widthMm: 297,
      heightMm: 210,
      backgroundUrl: layout.backgroundUrl ?? null,
      blocks: layout.blocks,
    },
    updatedById
  );
}

function playerUnitId(
  level: CompetitionLevel,
  profile: { trainingCenterId: string; districtId: string; stateId: string }
): string {
  if (level === "DISTRICT") return profile.trainingCenterId;
  if (level === "STATE") return profile.districtId;
  return profile.stateId;
}

function playerUnitName(
  level: CompetitionLevel,
  profile: {
    trainingCenter: { name: string } | null;
    district: { name: string } | null;
    state: { name: string } | null;
  }
): string {
  if (level === "DISTRICT") return profile.trainingCenter?.name?.trim() || "";
  if (level === "STATE") return profile.district?.name?.trim() || "";
  return profile.state?.name?.trim() || "";
}

export function mergeFieldsForRecipient(row: CertificateRecipient): CertificateMergeFields {
  return {
    playerName: row.fullName,
    rank: row.rankLabel,
    event: row.event,
    competition: row.competition,
    unitName: row.unitName,
    date: row.date,
  };
}

export async function buildCertificateRecipients(params: {
  competition: {
    id: string;
    name: string;
    level: CompetitionLevel;
    venue: string;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
  };
  eventId: string;
  kind: CertificateKindQuery;
  playerProfileWhere?: Prisma.PlayerProfileWhereInput;
}): Promise<CertificateRecipientsPayload> {
  const { competition, eventId, kind, playerProfileWhere } = params;
  const event = await prisma.event.findFirst({
    where: { id: eventId },
    select: { id: true, name: true, isActive: true, eventGroupId: true },
  });
  if (!event) {
    return {
      kind,
      competition: {
        id: competition.id,
        name: competition.name,
        date: formatCertificateDate(competition.startDate ?? competition.endDate ?? competition.createdAt),
        venue: competition.venue,
      },
      event: { id: eventId, name: "" },
      layout: await loadSavedLayout(kind),
      recipients: [],
    };
  }

  const date = formatCertificateDate(
    competition.startDate ?? competition.endDate ?? competition.createdAt
  );
  const rows = await participationRepository.findManyForEventCertificates(
    competition.id,
    eventId,
    playerProfileWhere
  );

  let podiumByUnit = new Map<string, { rankBand: number; rankLabel: string }>();
  if (kind === "winners") {
    const unitType = aggregateUnitTypeForLevel(competition.level);
    const standings = await prisma.competitionAggregateStanding.findMany({
      where: {
        competitionId: competition.id,
        eventId,
        unitType,
        rankBand: { in: [1, 2, 3] },
      },
      select: { unitId: true, rankBand: true },
    });
    for (const s of standings) {
      const prev = podiumByUnit.get(s.unitId);
      if (!prev || s.rankBand < prev.rankBand) {
        podiumByUnit.set(s.unitId, {
          rankBand: s.rankBand,
          rankLabel: rankLabelForBand(s.rankBand),
        });
      }
    }
  }

  const seen = new Set<string>();
  const recipients: CertificateRecipient[] = [];
  for (const row of rows) {
    if (seen.has(row.playerUserId)) continue;
    seen.add(row.playerUserId);
    const profile = row.playerUser.playerProfile;
    if (!profile) continue;
    const unitId = playerUnitId(competition.level, profile);
    const podium = podiumByUnit.get(unitId);
    if (kind === "winners" && !podium) continue;
    recipients.push({
      playerUserId: row.playerUserId,
      fullName: profile.fullName.trim() || row.playerUser.email,
      unitName: playerUnitName(competition.level, profile),
      rankLabel: podium?.rankLabel ?? "Participant",
      competition: competition.name,
      event: event.name,
      date,
    });
  }

  recipients.sort((a, b) => {
    const rankOrder = (label: string) =>
      label === "Gold" ? 0 : label === "Silver" ? 1 : label === "Bronze" ? 2 : 3;
    const byRank = rankOrder(a.rankLabel) - rankOrder(b.rankLabel);
    if (byRank !== 0) return byRank;
    return a.fullName.localeCompare(b.fullName);
  });

  return {
    kind,
    competition: {
      id: competition.id,
      name: competition.name,
      date,
      venue: competition.venue,
    },
    event: { id: event.id, name: event.name },
    layout: await loadSavedLayout(kind),
    recipients,
  };
}
