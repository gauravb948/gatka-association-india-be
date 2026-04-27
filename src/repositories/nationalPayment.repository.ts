import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const SINGLETON_ID = "singleton" as const;

export function findSingleton() {
  return prisma.nationalPaymentConfig.findUnique({ where: { id: SINGLETON_ID } });
}

export function upsertSingleton(data: {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  webhookSecret: string;
}) {
  const create: Prisma.NationalPaymentConfigCreateInput = {
    id: SINGLETON_ID,
    razorpayKeyId: data.razorpayKeyId,
    razorpayKeySecret: data.razorpayKeySecret,
    webhookSecret: data.webhookSecret,
  };
  return prisma.nationalPaymentConfig.upsert({
    where: { id: SINGLETON_ID },
    create,
    update: {
      razorpayKeyId: data.razorpayKeyId,
      razorpayKeySecret: data.razorpayKeySecret,
      webhookSecret: data.webhookSecret,
    },
  });
}

