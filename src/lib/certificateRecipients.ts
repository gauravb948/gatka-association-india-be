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
import * as generatedCertificateRepository from "../repositories/generatedCertificate.repository.js";
import * as participationRepository from "../repositories/participation.repository.js";

export type CertificateLogoOption = {
  id: string;
  label: string;
  url: string;
};

export type CertificateRecipient = {
  playerUserId: string;
  fullName: string;
  unitName: string;
  rankLabel: string;
  competition: string;
  event: string;
  date: string;
  fileUrl: string | null;
};

export type CertificateRecipientsPayload = {
  kind: CertificateKindQuery;
  competition: { id: string; name: string; date: string; venue: string };
  event: { id: string; name: string };
  layout: CertificateLayout;
  logos: CertificateLogoOption[];
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
      logos: parsed.data.logos ?? [],
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
      logos: layout.logos ?? [],
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

export async function listAboutUsLogos(): Promise<CertificateLogoOption[]> {
  const rows = await prisma.aboutUs.findMany({
    select: {
      id: true,
      logoUrl: true,
      stateTitle: true,
      stateId: true,
      state: { select: { name: true } },
    },
    orderBy: { stateTitle: "asc" },
  });
  return rows
    .filter((r) => r.logoUrl.trim())
    .map((r) => ({
      id: r.id,
      label: r.stateId ? r.state?.name?.trim() || r.stateTitle : "Gatka Federation of India",
      url: r.logoUrl.trim(),
    }))
    .sort((a, b) => {
      const aNat = a.label === "Gatka Federation of India" ? 0 : 1;
      const bNat = b.label === "Gatka Federation of India" ? 0 : 1;
      if (aNat !== bNat) return aNat - bNat;
      return a.label.localeCompare(b.label);
    });
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
  const [layout, logos, savedRows] = await Promise.all([
    loadSavedLayout(kind),
    listAboutUsLogos(),
    generatedCertificateRepository.findManyForEvent(
      competition.id,
      eventId,
      dbKindFromQuery(kind)
    ),
  ]);
  const savedByPlayer = new Map(savedRows.map((r) => [r.playerUserId, r.fileUrl]));

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
      layout,
      logos,
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
      fileUrl: savedByPlayer.get(row.playerUserId) ?? null,
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
    layout,
    logos,
    recipients,
  };
}
