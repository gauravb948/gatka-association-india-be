-- Remove unused username / userName fields (login identity is email only).

DROP INDEX IF EXISTS "User_username_key";
DROP INDEX IF EXISTS "DistrictRegistration_userName_idx";
DROP INDEX IF EXISTS "StateRegistration_userName_idx";

ALTER TABLE "User" DROP COLUMN IF EXISTS "username";
ALTER TABLE "StateRegistration" DROP COLUMN IF EXISTS "userName";
ALTER TABLE "DistrictRegistration" DROP COLUMN IF EXISTS "userName";
