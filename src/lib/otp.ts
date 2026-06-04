import { AppError } from "./errors.js";
import { verifyOtpVerificationToken } from "./jwt.js";

export const OTP_PURPOSES = ["REGISTRATION", "PASSWORD_RESET"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export function isEmailLike(value: string): boolean {
  return value.includes("@");
}

export function normalizePhoneOrEmail(input: string): string {
  const value = input.trim();
  if (isEmailLike(value)) return value.toLowerCase();
  const digits = value.replace(/\D+/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
}

export function toSmsNumber(input: string): string {
  const v = normalizePhoneOrEmail(input);
  if (isEmailLike(v)) {
    throw new AppError(400, "SMS OTP requires a mobile number", "INVALID_PARAMS");
  }
  if (v.length < 10 || v.length > 12) {
    throw new AppError(400, "Invalid phone number", "INVALID_PARAMS");
  }
  return v;
}

export function assertRegistrationVerificationToken(
  verificationToken: string,
  expectedIdentifiers: string[]
): { otpId: string; phoneOrEmail: string } {
  let tokenPayload: ReturnType<typeof verifyOtpVerificationToken>;
  try {
    tokenPayload = verifyOtpVerificationToken(verificationToken);
  } catch {
    throw new AppError(400, "Invalid or expired verification token", "INVALID_OTP_TOKEN");
  }
  if (tokenPayload.purpose !== "REGISTRATION") {
    throw new AppError(400, "Verification token purpose mismatch", "INVALID_OTP_TOKEN");
  }
  const normalizedAllowed = new Set(
    expectedIdentifiers
      .filter(Boolean)
      .map((v) => normalizePhoneOrEmail(v))
      .filter(Boolean)
  );
  if (!normalizedAllowed.has(tokenPayload.phoneOrEmail)) {
    throw new AppError(
      400,
      "Verification token does not match provided identifier",
      "INVALID_OTP_TOKEN"
    );
  }
  return { otpId: tokenPayload.otpId, phoneOrEmail: tokenPayload.phoneOrEmail };
}
