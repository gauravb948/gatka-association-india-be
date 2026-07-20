import type { Gender, Prisma } from "@prisma/client";
import { actorPlayerProfileScopeWhere } from "./competitionParticipation.js";
import { validatedOptionalGeoClauses } from "./userListFilters.js";
import type { DbUser } from "../types/user.js";

export async function buildReportPlayerProfileWhere(
  actor: DbUser,
  q: {
    stateId?: string;
    districtId?: string;
    trainingCenterId?: string;
    gender?: Gender;
  }
): Promise<Prisma.PlayerProfileWhereInput> {
  const parts: Prisma.PlayerProfileWhereInput[] = [actorPlayerProfileScopeWhere(actor)];

  const geoClauses = await validatedOptionalGeoClauses(actor, {
    page: 1,
    pageSize: 1,
    stateId: q.stateId,
    districtId: q.districtId,
    trainingCenterId: q.trainingCenterId,
  });
  if (geoClauses.length > 0) {
    parts.push(...(geoClauses as Prisma.PlayerProfileWhereInput[]));
  }

  if (q.gender) {
    parts.push({ gender: q.gender });
  }

  return parts.length === 1 ? parts[0]! : { AND: parts };
}
