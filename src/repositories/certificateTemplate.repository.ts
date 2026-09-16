import type { CertificateKind, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findByKind(kind: CertificateKind) {
  return prisma.certificateTemplate.findUnique({ where: { kind } });
}

export function upsertByKind(
  kind: CertificateKind,
  layout: Prisma.InputJsonValue,
  updatedById: string | null
) {
  return prisma.certificateTemplate.upsert({
    where: { kind },
    create: { kind, layout, updatedById },
    update: { layout, updatedById },
  });
}
