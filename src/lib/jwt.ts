import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";

const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
};

export type AccessTokenPayload = { sub: string; role: Role };

export function signAccessToken(payload: AccessTokenPayload, expiresInSec = 8 * 60 * 60): string {
  const opts: SignOptions = { expiresIn: expiresInSec };
  return jwt.sign({ sub: payload.sub, role: payload.role }, secret(), opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, secret()) as jwt.JwtPayload & {
    role: Role;
    sub?: string;
  };
  const sub = decoded.sub;
  if (!sub || !decoded.role) {
    throw new Error("Invalid token payload");
  }
  return { sub, role: decoded.role };
}
