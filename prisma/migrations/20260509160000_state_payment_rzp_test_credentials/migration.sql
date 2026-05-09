-- Set shared Razorpay **test** credentials on every state's `StatePaymentConfig`.
-- - Updates all existing rows
-- - Inserts a row for each `State` that does not yet have config (unique `stateId`)

UPDATE "StatePaymentConfig"
SET
  "razorpayKeyId" = 'rzp_test_Scw5bVZSkKpsgD',
  "razorpayKeySecret" = '1h25Qltx9PnnhYU8vfW9K2El',
  "webhookSecret" = '1h25Qltx9PnnhYU8vfW9K2El',
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "StatePaymentConfig" ("id", "stateId", "razorpayKeyId", "razorpayKeySecret", "webhookSecret", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  s."id",
  'rzp_test_Scw5bVZSkKpsgD',
  '1h25Qltx9PnnhYU8vfW9K2El',
  '1h25Qltx9PnnhYU8vfW9K2El',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "State" s
WHERE NOT EXISTS (
  SELECT 1 FROM "StatePaymentConfig" p WHERE p."stateId" = s."id"
);
