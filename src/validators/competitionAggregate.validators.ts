import { z } from "zod";

/** Body for POST /competitions/:id/aggregate-results — replaces standings for one event. */
export const competitionAggregateResultsBodySchema = z.object({
  eventId: z.string().min(1),
  /** Exactly one winning unit id (may also appear in second/third). */
  firstPlace: z.string().min(1),
  /** Zero or more units in second place (may overlap with first/third). */
  secondPlace: z.array(z.string()),
  /** Zero or more units in third place (may overlap with first/second). */
  thirdPlace: z.array(z.string()),
});
