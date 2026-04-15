import * as userRepository from "../repositories/user.repository.js";
import { signAccessToken } from "./jwt.js";
import { AppError } from "./errors.js";

export async function buildRegistrationAuthPayload(userId: string, registration: unknown) {
  const user = await userRepository.findByIdForLoginResponse(userId);
  if (!user) throw new AppError(500, "User not found");
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    user,
    registration,
  };
}
