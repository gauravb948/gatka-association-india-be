import type { Prisma } from "@prisma/client";
import { EntityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const publicStateSelect = { id: true, name: true, code: true } as const;

export function findManyPublic() {
  return prisma.state.findMany({
    where: { isEnabled: true },
    orderBy: { name: "asc" },
    select: publicStateSelect,
  });
}

export function findManyPublicPaginated(params: { skip: number; take: number }) {
  const where = { isEnabled: true };
  return prisma.$transaction([
    prisma.state.findMany({
      where,
      orderBy: { name: "asc" },
      skip: params.skip,
      take: params.take,
      select: publicStateSelect,
    }),
    prisma.state.count({ where }),
  ]);
}

/** Enabled states whose state-body registration is accepted and payment config exists. */
export function findManyPublicWithAcceptedRegistration() {
  return prisma.state.findMany({
    where: {
      isEnabled: true,
      registration: { is: { status: EntityStatus.ACCEPTED } },
      paymentConfig: { isNot: null },
    },
    orderBy: { name: "asc" },
    select: publicStateSelect,
  });
}

export function findManyPublicWithAcceptedRegistrationPaginated(params: {
  skip: number;
  take: number;
}) {
  const where = {
    isEnabled: true,
    registration: { is: { status: EntityStatus.ACCEPTED } },
    paymentConfig: { isNot: null },
  };
  return prisma.$transaction([
    prisma.state.findMany({
      where,
      orderBy: { name: "asc" },
      skip: params.skip,
      take: params.take,
      select: publicStateSelect,
    }),
    prisma.state.count({ where }),
  ]);
}

export function findManyAll() {
  return prisma.state.findMany({ orderBy: { name: "asc" } });
}

export function findManyAllPaginated(params: { skip: number; take: number }) {
  return prisma.$transaction([
    prisma.state.findMany({
      orderBy: { name: "asc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.state.count(),
  ]);
}

export function findById(id: string) {
  return prisma.state.findUnique({ where: { id } });
}

const paymentSummarySelect = {
  id: true,
  purpose: true,
  amountPaise: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

const membershipSummarySelect = {
  id: true,
  type: true,
  validFrom: true,
  validUntil: true,
  status: true,
  paymentId: true,
  createdAt: true,
  updatedAt: true,
  payment: { select: paymentSummarySelect },
} as const;

const applicantUserSelect = {
  id: true,
  email: true,
  username: true,
  phone: true,
  role: true,
  status: true,
  stateId: true,
  districtId: true,
  trainingCenterId: true,
  isActive: true,
  createdAt: true,
  memberships: {
    orderBy: { createdAt: "desc" },
    select: membershipSummarySelect,
  },
} as const;

const stateSlimSelect = {
  id: true,
  name: true,
  code: true,
  isEnabled: true,
} as const;

const districtSlimSelect = {
  id: true,
  name: true,
  stateId: true,
  isEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

const statePaymentConfigPublicSelect = {
  id: true,
  stateId: true,
  razorpayKeyId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Single state with main relations populated (no secrets on payment config). */
export function findByIdWithRelations(id: string) {
  return prisma.state.findUnique({
    where: { id },
    include: {
      registration: {
        include: {
          user: { select: applicantUserSelect },
          payment: { select: paymentSummarySelect },
        },
      },
    },
  });
}

export function createState(data: Prisma.StateCreateInput) {
  return prisma.state.create({ data });
}

export function updateState(id: string, data: Prisma.StateUpdateInput) {
  return prisma.state.update({ where: { id }, data });
}
