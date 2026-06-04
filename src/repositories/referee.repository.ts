import { prisma } from "../lib/prisma.js";

/** Accepted, active referees who are not blacklisted (public directory). */
const acceptedPublicRefereeWhere = {
  isBlacklisted: false,
  user: {
    role: "REFEREE" as const,
    status: "ACCEPTED" as const,
    isActive: true,
  },
};

const publicDirectorySelect = {
  fullName: true,
  state: { select: { id: true, name: true, code: true } },
  district: { select: { id: true, name: true } },
} as const;

export function findManyAcceptedPublicDirectory(skip: number, take: number) {
  return prisma.$transaction([
    prisma.refereeProfile.findMany({
      where: acceptedPublicRefereeWhere,
      select: publicDirectorySelect,
      orderBy: [{ state: { name: "asc" } }, { district: { name: "asc" } }, { fullName: "asc" }],
      skip,
      take,
    }),
    prisma.refereeProfile.count({ where: acceptedPublicRefereeWhere }),
  ]);
}
