import { z } from "zod";

export const participationRecordBodySchema = z.object({
  sessionId: z.string(),
  playerUserId: z.string(),
  competitionId: z.string(),
  level: z.enum(["DISTRICT", "STATE", "NATIONAL"]),
  participated: z.boolean().optional(),
});
