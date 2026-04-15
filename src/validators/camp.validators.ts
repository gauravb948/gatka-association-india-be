import { z } from "zod";

export const campBodySchema = z.object({
  sessionId: z.string().optional().nullable(),
  level: z.enum(["NATIONAL", "STATE", "DISTRICT"]),
  stateId: z.string().optional().nullable(),
  districtId: z.string().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  audience: z.enum(["PLAYERS", "VOLUNTEERS", "COACHES", "REFEREES", "ALL"]),
  feeAmountPaise: z.number().int().optional().nullable(),
});
