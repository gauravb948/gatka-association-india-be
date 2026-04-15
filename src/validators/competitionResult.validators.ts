import { z } from "zod";

export const competitionResultBodySchema = z.object({
  competitionId: z.string(),
  eventId: z.string(),
  playerUserId: z.string(),
  rank: z.number().int().optional().nullable(),
  score: z.string().optional().nullable(),
});
