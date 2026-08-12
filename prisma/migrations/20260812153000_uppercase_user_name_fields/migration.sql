-- Backfill person/org display name fields to uppercase (trim + UPPER).
-- Excludes email, passwords, addresses, phones, URLs, aadhar numbers, remarks.

UPDATE "PlayerProfile"
SET
  "fullName" = UPPER(TRIM("fullName")),
  "fatherName" = CASE WHEN "fatherName" IS NULL THEN NULL ELSE UPPER(TRIM("fatherName")) END,
  "motherName" = CASE WHEN "motherName" IS NULL THEN NULL ELSE UPPER(TRIM("motherName")) END;

UPDATE "CoachProfile"
SET
  "fullName" = UPPER(TRIM("fullName")),
  "fatherName" = CASE WHEN "fatherName" IS NULL THEN NULL ELSE UPPER(TRIM("fatherName")) END,
  "education" = CASE WHEN "education" IS NULL THEN NULL ELSE UPPER(TRIM("education")) END;

UPDATE "RefereeProfile"
SET
  "fullName" = UPPER(TRIM("fullName")),
  "fatherName" = CASE WHEN "fatherName" IS NULL THEN NULL ELSE UPPER(TRIM("fatherName")) END,
  "education" = CASE WHEN "education" IS NULL THEN NULL ELSE UPPER(TRIM("education")) END,
  "appliedFor" = CASE WHEN "appliedFor" IS NULL THEN NULL ELSE UPPER(TRIM("appliedFor")) END;

UPDATE "VolunteerProfile"
SET
  "fullName" = UPPER(TRIM("fullName")),
  "fatherName" = CASE WHEN "fatherName" IS NULL THEN NULL ELSE UPPER(TRIM("fatherName")) END,
  "motherName" = CASE WHEN "motherName" IS NULL THEN NULL ELSE UPPER(TRIM("motherName")) END,
  "disabilityDetails" = CASE WHEN "disabilityDetails" IS NULL THEN NULL ELSE UPPER(TRIM("disabilityDetails")) END;

UPDATE "VolunteerRegistration"
SET
  "fullName" = UPPER(TRIM("fullName")),
  "fatherName" = UPPER(TRIM("fatherName")),
  "motherName" = UPPER(TRIM("motherName")),
  "disabilityDetails" = CASE WHEN "disabilityDetails" IS NULL THEN NULL ELSE UPPER(TRIM("disabilityDetails")) END;

UPDATE "TrainingCenter"
SET
  "name" = UPPER(TRIM("name")),
  "headName" = CASE WHEN "headName" IS NULL THEN NULL ELSE UPPER(TRIM("headName")) END;

UPDATE "StateRegistration"
SET
  "firstName" = UPPER(TRIM("firstName")),
  "lastName" = UPPER(TRIM("lastName")),
  "associationName" = CASE WHEN "associationName" IS NULL THEN NULL ELSE UPPER(TRIM("associationName")) END;

UPDATE "DistrictRegistration"
SET
  "firstName" = UPPER(TRIM("firstName")),
  "lastName" = UPPER(TRIM("lastName"));
