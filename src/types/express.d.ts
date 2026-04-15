import type { Role } from "@prisma/client";
import type { DbUser } from "./user";

declare global {
  namespace Express {
    interface Request {
      auth?: { userId: string; role: Role };
      dbUser?: DbUser;
    }
  }
}

export {};
