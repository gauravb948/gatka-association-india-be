-- Speed up latest-valid OTP lookups by identifier + purpose.
CREATE INDEX IF NOT EXISTS "OtpCode_phoneOrEmail_purpose_consumedAt_expiresAt_idx"
ON "OtpCode"("phoneOrEmail", "purpose", "consumedAt", "expiresAt");
