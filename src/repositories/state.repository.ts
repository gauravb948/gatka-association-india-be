import type { State, Prisma } from "@prisma/client";
import { EntityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const publicStateSelect = { id: true, name: true, code: true } as const;

export function findManyPublic() {
  return prisma.state.findMany({
    where: { isEnabled: true, registration: { is: null } },
    orderBy: { name: "asc" },
    select: publicStateSelect,
  });
}

export function findManyPublicPaginated(params: { skip: number; take: number }) {
  const where = { isEnabled: true, registration: { is: null } };
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

/** Admin list: newest state-body registration activity first (`StateRegistration.updatedAt`), then alphabetically by name. */
export async function findManyAllPaginated(params: { skip: number; take: number }) {
  const [idRows, total] = await prisma.$transaction([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT s.id FROM "State" s
      LEFT JOIN "StateRegistration" sr ON sr."stateId" = s.id
      ORDER BY sr."updatedAt" DESC NULLS LAST, s.name ASC
      LIMIT ${params.take}
      OFFSET ${params.skip}
    `,
    prisma.state.count(),
  ]);
  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) return [[], total] as const;
  const rows = await prisma.state.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = ids.map((id) => byId.get(id)).filter(Boolean) as State[];
  return [items, total] as const;
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
