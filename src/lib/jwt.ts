import jwt, { type SignOptions } from "jsonwebtoken";
import type { Role } from "@prisma/client";
import type { OtpPurpose } from "./otp.js";

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

export type OtpVerificationTokenPayload = {
  phoneOrEmail: string;
  purpose: OtpPurpose;
  otpId: string;
  typ: "OTP_VERIFICATION";
};

export function signOtpVerificationToken(
  payload: OtpVerificationTokenPayload,
  expiresInSec = 10 * 60
): string {
  const opts: SignOptions = { expiresIn: expiresInSec };
  return jwt.sign(payload, secret(), opts);
}

export function verifyOtpVerificationToken(token: string): OtpVerificationTokenPayload {
  const decoded = jwt.verify(token, secret()) as jwt.JwtPayload & Partial<OtpVerificationTokenPayload>;
  if (
    decoded.typ !== "OTP_VERIFICATION" ||
    typeof decoded.phoneOrEmail !== "string" ||
    (decoded.purpose !== "REGISTRATION" && decoded.purpose !== "PASSWORD_RESET") ||
    typeof decoded.otpId !== "string"
  ) {
    throw new Error("Invalid OTP verification token");
  }
  return {
    phoneOrEmail: decoded.phoneOrEmail,
    purpose: decoded.purpose,
    otpId: decoded.otpId,
    typ: "OTP_VERIFICATION",
  };
}
