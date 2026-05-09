import { z } from "zod";

/** Query for public ID-card lookup by user id (no auth). */
export const publicUserIdCardQuerySchema = z.object({
  userId: z.string().trim().min(1, "userId is required"),
});

export type PublicUserIdCardQuery = z.infer<typeof publicUserIdCardQuerySchema>;
