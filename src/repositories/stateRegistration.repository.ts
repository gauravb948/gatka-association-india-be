import type { EntityStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const stateSelect = { id: true, name: true, code: true, isEnabled: true } as const;

/** Linked applicant user — never include passwordHash. */
const applicantUserSelect = {
  id: true,
  email: true,
  phone: true,
  role: true,
  status: true,
  stateId: true,
  districtId: true,
  isActive: true,
  createdAt: true,
} as const;

const registrationListInclude = {
  state: { select: stateSelect },
  user: { select: applicantUserSelect },
} as const;

/** District rows under the state with each district's body registration (when present). */
const districtWithDistrictRegistrationSelect = {
  id: true,
  name: true,
  isEnabled: true,
  registration: {
    select: {
      id: true,
      districtId: true,
      stateId: true,
      userId: true,
      firstName: true,
      lastName: true,
      email: true,
      mobileNo: true,
      address: true,
      passportPhotoUrl: true,
      status: true,
      statusReason: true,
      paymentId: true,
      createdAt: true,
      updatedAt: true,
    },
  },
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

/** Single-record fetch: state tree, district registrations, linked payment. */
const registrationDetailInclude = {
  state: {
    include: {
      districts: {
        orderBy: { name: "asc" as const },
        select: districtWithDistrictRegistrationSelect,
      },
    },
  },
  user: { select: applicantUserSelect },
  payment: { select: paymentSummarySelect },
} as const;

export function findByStateId(stateId: string) {
  return prisma.stateRegistration.findUnique({
    where: { stateId },
    include: registrationDetailInclude,
  });
}

export function findById(id: string) {
  return prisma.stateRegistration.findUnique({
    where: { id },
    include: registrationDetailInclude,
  });
}

export function findManyPaginated(params: {
  skip: number;
  take: number;
  statuses?: EntityStatus[];
}) {
  const where: Prisma.StateRegistrationWhereInput =
    params.statuses && params.statuses.length > 0
      ? { status: { in: params.statuses } }
      : {};

  return prisma.$transaction([
    prisma.stateRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: registrationListInclude,
    }),
    prisma.stateRegistration.count({ where }),
  ]);
}

export function create(data: Prisma.StateRegistrationCreateInput) {
  return prisma.stateRegistration.create({
    data,
    include: registrationListInclude,
  });
}

export function update(id: string, data: Prisma.StateRegistrationUpdateInput) {
  return prisma.stateRegistration.update({
    where: { id },
    data,
    include: registrationListInclude,
  });
}
