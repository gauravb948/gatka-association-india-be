import { PrismaClient } from "@prisma/client";

/**
 * Soft-deleted State / District / TrainingCenter rows are hidden from list and
 * lookup queries unless `where.deletedAt` is set explicitly.
 * Pass `deletedAt: undefined` (see `includeSoftDeleted`) to include deleted rows.
 */
function withLiveGeoDefault<T extends object | undefined>(where: T): T {
  const next = { ...(where ?? {}) } as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(next, "deletedAt")) {
    if (next.deletedAt === undefined) {
      delete next.deletedAt;
    }
    return next as T;
  }
  next.deletedAt = null;
  return next as T;
}

const GEO_MODELS = new Set(["State", "District", "TrainingCenter"]);
const GEO_LIST_ACTIONS = new Set(["findMany", "findFirst", "count"]);

const prismaClient = new PrismaClient();

prismaClient.$use(async (params, next) => {
  if (params.model && GEO_MODELS.has(params.model) && GEO_LIST_ACTIONS.has(params.action)) {
    params.args = params.args ?? {};
    params.args.where = withLiveGeoDefault(params.args.where);
  }
  return next(params);
});

export const prisma = prismaClient;

/** Spread into `where` so a geo query can see soft-deleted rows. */
export const includeSoftDeleted = { deletedAt: undefined };
