import { prisma } from "../lib/prisma.js";

const stateSummarySelect = {
  select: { id: true, name: true, code: true },
} as const;

const domainIncludeState = {
  include: { state: stateSummarySelect },
} as const;

// Prisma client types lag until `prisma generate` succeeds locally; use dynamic delegate for compile safety.
const stateDomainDelegate = (prisma as unknown as { stateDomain: any }).stateDomain;

export function findMany() {
  return stateDomainDelegate.findMany({
    ...domainIncludeState,
    orderBy: { state: { name: "asc" } },
  });
}

export function findByStateId(stateId: string) {
  return stateDomainDelegate.findUnique({
    where: { stateId },
    ...domainIncludeState,
  });
}

export function findByDomainName(domainName: string) {
  return stateDomainDelegate.findUnique({
    where: { domainName },
    ...domainIncludeState,
  });
}

export function upsertForState(stateId: string, domainName: string) {
  const create = {
    domainName,
    state: { connect: { id: stateId } },
  };
  const update = {
    domainName,
  };
  return stateDomainDelegate.upsert({
    where: { stateId },
    create,
    update,
    ...domainIncludeState,
  });
}
