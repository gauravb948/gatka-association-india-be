import { prisma } from "../lib/prisma.js";

const SINGLETON_ID = "singleton";

export function get() {
  return prisma.nationalNotice.findUnique({ where: { id: SINGLETON_ID } });
}

export function upsert(data: { title: string; body: string; updatedById: string | null }) {
  return prisma.nationalNotice.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      title: data.title,
      body: data.body,
      updatedById: data.updatedById,
    },
    update: {
      title: data.title,
      body: data.body,
      updatedById: data.updatedById,
    },
  });
}
