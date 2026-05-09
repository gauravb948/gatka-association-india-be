import type { Role } from "@prisma/client";
import { prisma } from "./prisma.js";

/** Adds `stateRegistrationId` / `districtRegistrationId` for admin roles (same shape as login `user`). */
export async function withAdminRegistrationIds<T extends { id: string; role: Role }>(user: T) {
  if (user.role === "STATE_ADMIN") {
    const reg = await prisma.stateRegistration.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return { ...user, stateRegistrationId: reg?.id ?? null };
  }
  if (user.role === "DISTRICT_ADMIN") {
    const reg = await prisma.districtRegistration.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    return { ...user, districtRegistrationId: reg?.id ?? null };
  }
  return user;
}
