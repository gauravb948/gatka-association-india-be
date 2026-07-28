import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export function create(data: Prisma.RazorpayWebhookEventCreateInput) {
  return prisma.razorpayWebhookEvent.create({ data });
}

export function update(
  id: string,
  data: Prisma.RazorpayWebhookEventUpdateInput
) {
  return prisma.razorpayWebhookEvent.update({ where: { id }, data });
}
