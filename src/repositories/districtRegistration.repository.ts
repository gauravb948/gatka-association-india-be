import type { EntityStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const districtSelect = {
  id: true,
  name: true,
  stateId: true,
  isEnabled: true,
} as const;

const stateSelect = { id: true, name: true, code: true, isEnabled: true } as const;

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
  district: { select: districtSelect },
  state: { select: stateSelect },
  user: { select: applicantUserSelect },
} as const;

const stateWithStateRegistrationSelect = {
  id: true,
  name: true,
  code: true,
  isEnabled: true,
  registration: {
    select: {
      id: true,
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
      user: { select: applicantUserSelect },
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

const registrationDetailInclude = {
  district: { select: districtSelect },
  state: { select: stateWithStateRegistrationSelect },
  user: { select: applicantUserSelect },
  payment: { select: paymentSummarySelect },
} as const;

export function findByDistrictId(districtId: string) {
  return prisma.districtRegistration.findUnique({
    where: { districtId },
    include: registrationDetailInclude,
  });
}

export function findById(id: string) {
  return prisma.districtRegistration.findUnique({
    where: { id },
    include: registrationDetailInclude,
  });
}

export function findManyPaginated(params: {
  skip: number;
  take: number;
  statuses?: EntityStatus[];
}) {
  const where: Prisma.DistrictRegistrationWhereInput =
    params.statuses && params.statuses.length > 0
      ? { status: { in: params.statuses } }
      : {};

  return prisma.$transaction([
    prisma.districtRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: registrationListInclude,
    }),
    prisma.districtRegistration.count({ where }),
  ]);
}

export function findManyByStateIdPaginated(params: {
  stateId: string;
  skip: number;
  take: number;
  statuses?: EntityStatus[];
}) {
  const where: Prisma.DistrictRegistrationWhereInput = {
    district: { stateId: params.stateId },
    ...(params.statuses && params.statuses.length > 0
      ? { status: { in: params.statuses } }
      : {}),
  };

  return prisma.$transaction([
    prisma.districtRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: registrationListInclude,
    }),
    prisma.districtRegistration.count({ where }),
  ]);
}

export function create(data: Prisma.DistrictRegistrationCreateInput) {
  return prisma.districtRegistration.create({
    data,
    include: registrationListInclude,
  });
}

export function update(id: string, data: Prisma.DistrictRegistrationUpdateInput) {
  return prisma.districtRegistration.update({
    where: { id },
    data,
    include: registrationListInclude,
  });
}
