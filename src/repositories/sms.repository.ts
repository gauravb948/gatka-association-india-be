import type { Prisma, SmsTemplateKey } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function findAllTemplates() {
  return prisma.smsTemplate.findMany();
}

export function upsertTemplate(key: SmsTemplateKey, template: string) {
  return prisma.smsTemplate.upsert({
    where: { key },
    create: { key, template },
    update: { template },
  });
}

export function findOutboxRecent(take: number) {
  return prisma.smsOutbox.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function createOutbox(data: Prisma.SmsOutboxCreateInput) {
  return prisma.smsOutbox.create({ data });
}
