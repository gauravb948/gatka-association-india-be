-- Insert a singleton national Razorpay config if missing.
-- This is a placeholder so state registrations can use national config immediately in dev.

INSERT INTO "NationalPaymentConfig" (
  "id",
  "razorpayKeyId",
  "razorpayKeySecret",
  "webhookSecret",
  "createdAt",
  "updatedAt"
)
VALUES (
  'singleton',
  'rzp_test_dummy',
  'dummy_secret',
  'whsec_dummy',
  NOW(),
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

