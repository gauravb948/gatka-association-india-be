import { prisma } from "../lib/prisma.js";
import type { Role } from "@prisma/client";

export async function setPhotoUrlForUserRole(
  userId: string,
  role: Role,
  photoUrl: string
) {
  switch (role) {
    case "PLAYER":
      return prisma.playerProfile.update({
        where: { userId },
        data: { photoUrl },
      });
    case "COACH":
      return prisma.coachProfile.update({
        where: { userId },
        data: { photoUrl },
      });
    case "REFEREE":
      return prisma.refereeProfile.update({
        where: { userId },
        data: { photoUrl },
      });
    case "VOLUNTEER":
      return prisma.volunteerProfile.update({
        where: { userId },
        data: { photoUrl },
      });
    default:
      return null;
  }
}

