import { z } from "zod";

/** Body for `PATCH /users/:userId/password` (hierarchy-managed reset). */
export const hierarchyResetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
});

export type HierarchyResetPasswordBody = z.infer<typeof hierarchyResetPasswordSchema>;
