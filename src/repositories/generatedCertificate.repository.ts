import type { CertificateKind } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function upsertGenerated(params: {
  competitionId: string;
  eventId: string;
  playerUserId: string;
  kind: CertificateKind;
  fileUrl: string;
  generatedById: string | null;
}) {
  return prisma.generatedCertificate.upsert({
    where: {
      competitionId_eventId_playerUserId_kind: {
        competitionId: params.competitionId,
        eventId: params.eventId,
        playerUserId: params.playerUserId,
        kind: params.kind,
      },
    },
    create: params,
    update: {
      fileUrl: params.fileUrl,
      generatedById: params.generatedById,
    },
  });
}

export function findManyForEvent(competitionId: string, eventId: string, kind: CertificateKind) {
  return prisma.generatedCertificate.findMany({
    where: { competitionId, eventId, kind },
    select: { playerUserId: true, fileUrl: true, updatedAt: true },
  });
}

export function countByEventKind(pairs: { competitionId: string; eventId: string }[]) {
  if (pairs.length === 0) return Promise.resolve([]);
  return prisma.generatedCertificate.groupBy({
    by: ["competitionId", "eventId", "kind"],
    where: { OR: pairs },
    _count: { _all: true },
  });
}
