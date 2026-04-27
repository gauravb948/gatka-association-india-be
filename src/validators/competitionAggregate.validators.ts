import { z } from "zod";

/** Body for POST /competitions/:id/aggregate-results — replaces all aggregate standings for the competition. */
export const competitionAggregateResultsBodySchema = z
  .object({
    /** Exactly one unit id (training center, district, or state id depending on competition level). */
    firstPlace: z.string().min(1),
    /** Zero or more units tied for second. */
    secondPlace: z.array(z.string()),
    /** Zero or more units tied for third. */
    thirdPlace: z.array(z.string()),
  })
  .superRefine((body, ctx) => {
    const all = [body.firstPlace, ...body.secondPlace, ...body.thirdPlace];
    const set = new Set(all);
    if (set.size !== all.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Each unit may appear only once across first, second, and third",
        path: ["firstPlace"],
      });
    }
  });
