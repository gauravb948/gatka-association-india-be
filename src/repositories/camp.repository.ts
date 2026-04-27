import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

const campListInclude = {
  states: true,
  districts: true,
} satisfies Prisma.CampInclude;

const campDetailInclude = {
  ...campListInclude,
  createdBy: {
    select: {
      id: true,
      email: true,
      role: true,
      stateId: true,
      districtId: true,
    },
  },
} satisfies Prisma.CampInclude;

export async function findManyPaginated(params: {
  skip: number;
  take: number;
  nameContains?: string;
}) {
  const where: Prisma.CampWhereInput = params.nameContains
    ? { name: { contains: params.nameContains, mode: "insensitive" } }
    : {};
  const [total, items] = await Promise.all([
    prisma.camp.count({ where }),
    prisma.camp.findMany({
      where,
      orderBy: { startDate: "desc" },
      skip: params.skip,
      take: params.take,
      include: campListInclude,
    }),
  ]);
  return { items, total };
}

export function findById(id: string) {
  return prisma.camp.findUnique({ where: { id } });
}

/** Camp with states + districts for registration checks. */
export function findByIdWithScope(id: string) {
  return prisma.camp.findUnique({
    where: { id },
    include: campListInclude,
  });
}

export function createCamp(data: Prisma.CampCreateInput) {
  return prisma.camp.create({ data, include: campDetailInclude });
}

export function createCampRegistration(data: Prisma.CampRegistrationCreateInput) {
  return prisma.campRegistration.create({ data });
}

export function findRegistrationsByCamp(campId: string) {
  return prisma.campRegistration.findMany({
    where: { campId },
    include: { user: { select: { id: true, email: true, role: true } } },
  });
}

export function updateCampRegistration(
  id: string,
  data: Prisma.CampRegistrationUpdateInput
) {
  return prisma.campRegistration.update({ where: { id }, data });
}

export type CampGeoUpdate = { stateIds: string[]; districtIds: string[] };

export async function updateCampAndGeo(
  id: string,
  data: Prisma.CampUpdateInput,
  opts?: { geo?: CampGeoUpdate }
) {
  return prisma.$transaction(async (tx) => {
    if (opts?.geo) {
      await tx.campState.deleteMany({ where: { campId: id } });
      await tx.campDistrict.deleteMany({ where: { campId: id } });
      if (opts.geo.stateIds.length > 0) {
        await tx.campState.createMany({
          data: opts.geo.stateIds.map((stateId) => ({ campId: id, stateId })),
        });
      }
      if (opts.geo.districtIds.length > 0) {
        await tx.campDistrict.createMany({
          data: opts.geo.districtIds.map((districtId) => ({ campId: id, districtId })),
        });
      }
    }
    const include = campDetailInclude;
    if (Object.keys(data).length > 0) {
      return tx.camp.update({ where: { id }, data, include });
    }
    return tx.camp.findUniqueOrThrow({ where: { id }, include });
  });
}
