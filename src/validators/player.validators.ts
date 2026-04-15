import { z } from "zod";

export const playerRenewalPaymentSchema = z.object({
  stateId: z.string(),
  amountPaise: z.number().int().positive(),
});

export const playerTcDisableSchema = z.object({
  tcDisabled: z.boolean(),
  tcDisabledRemarks: z.string().optional(),
});

export const playerDistrictBlacklistSchema = z.object({
  isBlacklisted: z.boolean(),
  blacklistRemarks: z.string().optional(),
});
