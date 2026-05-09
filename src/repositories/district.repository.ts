import type { District, Prisma } from "@prisma/client";
import { EntityStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const publicDistrictSelect = { id: true, name: true, stateId: true } as const;

export function findManyPublicByState(stateId: string) {
  return prisma.district.findMany({
    where: { stateId, isEnabled: true, registration: { is: null } },
    orderBy: { name: "asc" },
    select: publicDistrictSelect,
  });
}

export function findManyPublicByStatePaginated(stateId: string, params: { skip: number; take: number }) {
  const where = { stateId, isEnabled: true, registration: { is: null } };
  return prisma.$transaction([
    prisma.district.findMany({
      where,
      orderBy: { name: "asc" },
      skip: params.skip,
      take: params.take,
      select: publicDistrictSelect,
    }),
    prisma.district.count({ where }),
  ]);
}

/** Enabled districts in the state whose district-body registration has been accepted. */
export function findManyPublicByStateWithAcceptedRegistration(stateId: string) {
  return prisma.district.findMany({
    where: {
      stateId,
      isEnabled: true,
      registration: { is: { status: EntityStatus.ACCEPTED } },
    },
    orderBy: { name: "asc" },
    select: publicDistrictSelect,
  });
}

export function findManyPublicByStateWithAcceptedRegistrationPaginated(
  stateId: string,
  params: { skip: number; take: number }
) {
  const where = {
    stateId,
    isEnabled: true,
    registration: { is: { status: EntityStatus.ACCEPTED } },
  };
  return prisma.$transaction([
    prisma.district.findMany({
      where,
      orderBy: { name: "asc" },
      skip: params.skip,
      take: params.take,
      select: publicDistrictSelect,
    }),
    prisma.district.count({ where }),
  ]);
}

export function findManyByState(stateId: string) {
  return prisma.district.findMany({
    where: { stateId },
    orderBy: { name: "asc" },
  });
}

/** Admin list for state: newest district-body registration activity first (`DistrictRegistration.updatedAt`), then name. */
export async function findManyByStatePaginated(
  stateId: string,
  params: { skip: number; take: number }
) {
  const where = { stateId };
  const [idRows, total] = await prisma.$transaction([
    prisma.$queryRaw<{ id: string }[]>`
      SELECT d.id FROM "District" d
      LEFT JOIN "DistrictRegistration" dr ON dr."districtId" = d.id
      WHERE d."stateId" = ${stateId}
      ORDER BY dr."updatedAt" DESC NULLS LAST, d.name ASC
      LIMIT ${params.take}
      OFFSET ${params.skip}
    `,
    prisma.district.count({ where }),
  ]);
  const ids = idRows.map((r) => r.id);
  if (ids.length === 0) return [[], total] as const;
  const rows = await prisma.district.findMany({ where: { id: { in: ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const items = ids.map((id) => byId.get(id)).filter(Boolean) as District[];
  return [items, total] as const;
}

/** All districts in any of the given states (enabled + public shape). */
export function findManyPublicByStateIds(stateIds: string[]) {
  return prisma.district.findMany({
    where: { stateId: { in: stateIds }, isEnabled: true, registration: { is: null } },
    orderBy: [{ stateId: "asc" }, { name: "asc" }],
    select: publicDistrictSelect,
  });
}

/** Enabled districts in any of the given states whose district-body registration is ACCEPTED. */
export function findManyWithAcceptedRegistrationByStateIds(stateIds: string[]) {
  if (stateIds.length === 0) {
    return Promise.resolve([] as { id: string; name: string; stateId: string }[]);
  }
  return prisma.district.findMany({
    where: {
      stateId: { in: stateIds },
      isEnabled: true,
      registration: { is: { status: EntityStatus.ACCEPTED } },
    },
    orderBy: [{ stateId: "asc" }, { name: "asc" }],
    select: publicDistrictSelect,
  });
}

export function findById(id: string) {
  return prisma.district.findUnique({ where: { id } });
}

export function findByIdWithState(id: string) {
  return prisma.district.findUnique({
    where: { id },
    include: { state: true },
  });
}

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
} as const;

const paymentSummarySelect = {
  id: true,
  purpose: true,
  amountPaise: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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

/** Single district with parent state, registrations, training centers, and related rows (no payment-config secrets). */
export function findByIdWithRelations(id: string) {
  return prisma.district.findUnique({
    where: { id },
    include: {
      state: {
        include: {
          registration: {
            include: {
              user: { select: applicantUserSelect },
              payment: { select: paymentSummarySelect },
            },
          },
          paymentConfig: { select: statePaymentConfigPublicSelect },
          districts: {
            orderBy: { name: "asc" },
            select: districtSlimSelect,
          },
        },
      },
      trainingCenters: {
        orderBy: { name: "asc" },
        include: {
          district: { select: districtSlimSelect },
        },
      },
      registration: {
        include: {
          user: { select: applicantUserSelect },
          payment: { select: paymentSummarySelect },
        },
      },
    },
  });
}

export function createDistrict(data: Prisma.DistrictCreateInput) {
  return prisma.district.create({ data });
}

export function updateDistrict(id: string, data: Prisma.DistrictUpdateInput) {
  return prisma.district.update({ where: { id }, data });
}
