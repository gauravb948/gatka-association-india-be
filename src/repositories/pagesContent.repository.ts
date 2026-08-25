import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const includeState = {
  include: { state: { select: { id: true, name: true, code: true } } },
} as const;

export function findByPageAndState(page: string, stateId: string | null) {
  return prisma.pagesContent.findFirst({
    where: { page, stateId },
    ...includeState,
  });
}

export function findPublicByPageAndState(page: string, stateId: string | null) {
  return prisma.pagesContent.findFirst({
    where: { page, stateId, isEnabled: true },
  });
}

export function findById(id: string) {
  return prisma.pagesContent.findUnique({
    where: { id },
    ...includeState,
  });
}

export function create(data: Prisma.PagesContentUncheckedCreateInput) {
  return prisma.pagesContent.create({
    data,
    ...includeState,
  });
}

export function update(id: string, data: Prisma.PagesContentUncheckedUpdateInput) {
  return prisma.pagesContent.update({
    where: { id },
    data,
    ...includeState,
  });
}

export async function saveByPageAndState(
  page: string,
  stateId: string | null,
  data: {
    title: string;
    detailedDescription: string;
    isEnabled: boolean;
  }
) {
  const existing = await findByPageAndState(page, stateId);
  if (existing) {
    return update(existing.id, data);
  }
  return create({ page, stateId, ...data });
}
