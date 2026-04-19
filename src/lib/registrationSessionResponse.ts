import * as userRepository from "../repositories/user.repository.js";
import { prisma } from "./prisma.js";
import { signAccessToken } from "./jwt.js";
import { AppError } from "./errors.js";

export async function buildRegistrationAuthPayload(userId: string, registration: unknown) {
  const [user, stateReg, districtReg] = await Promise.all([
    userRepository.findByIdForLoginResponse(userId),
    prisma.stateRegistration.findUnique({
      where: { userId },
      select: { id: true },
    }),
    prisma.districtRegistration.findUnique({
      where: { userId },
      select: { id: true },
    }),
  ]);
  if (!user) throw new AppError(500, "User not found");
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    user: {
      ...user,
      stateRegistrationId: stateReg?.id ?? null,
      districtRegistrationId: districtReg?.id ?? null,
    },
    registration,
  };
}
