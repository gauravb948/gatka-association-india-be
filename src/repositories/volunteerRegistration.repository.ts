import type { Gender, MaritalStatus, Prisma, VolunteerRegistrationStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const geoSelect = {
  state: { select: { id: true, name: true, isEnabled: true } },
  district: { select: { id: true, name: true, stateId: true, isEnabled: true } },
} as const;

export function findByEmail(email: string) {
  return prisma.volunteerRegistration.findUnique({ where: { email } });
}

export function findById(id: string) {
  return prisma.volunteerRegistration.findUnique({
    where: { id },
    include: geoSelect,
  });
}

export function create(data: Prisma.VolunteerRegistrationCreateInput) {
  return prisma.volunteerRegistration.create({
    data,
    include: geoSelect,
  });
}

export type VolunteerRegistrationListFilters = {
  skip: number;
  take: number;
  scope: Prisma.VolunteerRegistrationWhereInput;
  stateId?: string;
  districtId?: string;
  gender?: Gender;
  maritalStatus?: MaritalStatus;
  hasDisability?: boolean;
  status?: VolunteerRegistrationStatus;
  search?: string;
  createdFrom?: Date;
  createdTo?: Date;
};

function buildWhere(params: VolunteerRegistrationListFilters): Prisma.VolunteerRegistrationWhereInput {
  const parts: Prisma.VolunteerRegistrationWhereInput[] = [params.scope];

  if (params.stateId) parts.push({ stateId: params.stateId });
  if (params.districtId) parts.push({ districtId: params.districtId });
  if (params.gender) parts.push({ gender: params.gender });
  if (params.maritalStatus) parts.push({ maritalStatus: params.maritalStatus });
  if (params.hasDisability !== undefined) parts.push({ hasDisability: params.hasDisability });
  if (params.status) parts.push({ status: params.status });

  if (params.createdFrom || params.createdTo) {
    parts.push({
      createdAt: {
        ...(params.createdFrom ? { gte: params.createdFrom } : {}),
        ...(params.createdTo ? { lte: params.createdTo } : {}),
      },
    });
  }

  const q = params.search?.trim();
  if (q) {
    parts.push({
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { alternatePhone: { contains: q } },
      ],
    });
  }

  return parts.length === 1 ? parts[0]! : { AND: parts };
}

export function findManyPaginated(params: VolunteerRegistrationListFilters) {
  const where = buildWhere(params);
  return prisma.$transaction([
    prisma.volunteerRegistration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: params.skip,
      take: params.take,
      include: geoSelect,
    }),
    prisma.volunteerRegistration.count({ where }),
  ]);
}
