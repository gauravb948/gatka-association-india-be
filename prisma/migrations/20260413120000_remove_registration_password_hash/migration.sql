-- Passwords are stored only on User; registration rows hold applicant profile only.
ALTER TABLE "StateRegistration" DROP COLUMN IF EXISTS "passwordHash";
ALTER TABLE "DistrictRegistration" DROP COLUMN IF EXISTS "passwordHash";
