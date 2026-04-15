import type { EntityStatus, Prisma, Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import * as userRepository from "../repositories/user.repository.js";
import { validatedOptionalGeoClauses } from "../lib/userListFilters.js";
import { hierarchyGeoWhere } from "../lib/userListScope.js";
import { userHierarchyListQuerySchema } from "../validators/userList.validators.js";

function buildListWhere(
  targetRole: Role,
  geo: Prisma.UserWhereInput,
  optional: Prisma.UserWhereInput[],
  statuses?: EntityStatus[]
): Prisma.UserWhereInput {
  const parts: Prisma.UserWhereInput[] = [{ role: targetRole }];
  if (Object.keys(geo).length > 0) {
    parts.push(geo);
  }
  parts.push(...optional);
  if (statuses?.length) {
    parts.push({ status: { in: statuses } });
  }
  return parts.length === 1 ? parts[0]! : { AND: parts };
}

export function listUsersByRole(targetRole: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const actor = req.dbUser!;
      const q = userHierarchyListQuerySchema.parse(req.query);
      const geo = hierarchyGeoWhere(actor, targetRole);
      const optional = await validatedOptionalGeoClauses(actor, q);
      const where = buildListWhere(targetRole, geo, optional, q.status);
      const skip = (q.page - 1) * q.pageSize;
      const [items, total] = await userRepository.findManyPaginatedWithWhere({
        where,
        skip,
        take: q.pageSize,
      });
      const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
      res.json({
        items,
        page: q.page,
        pageSize: q.pageSize,
        total,
        totalPages,
        role: targetRole,
      });
    } catch (e) {
      next(e);
    }
  };
}
