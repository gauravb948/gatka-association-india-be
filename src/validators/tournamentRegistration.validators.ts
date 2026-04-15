import { z } from "zod";

export const tournamentRegistrationBodySchema = z.object({
  competitionId: z.string(),
  playerUserId: z.string(),
  eventId: z.string(),
});

export const tournamentFinalizePaymentSchema = z.object({
  amountPaise: z.number().int().positive(),
});
