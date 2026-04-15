import { z } from "zod";

/** Query for `GET /age-categories/admin`: page, pageSize. */
export const ageCategoryAdminListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const ageCategoryBodySchema = z.object({
  name: z.string().min(1),
  ageFrom: z.number().int().min(0).nullable().optional(),
  ageTo: z.number().int().min(0).nullable().optional(),
  bandType: z
    .enum(["SUB_JUNIOR", "JUNIOR", "SENIOR", "VETERAN", "OPEN"])
    .nullable()
    .optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
