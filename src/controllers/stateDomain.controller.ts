import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { getNationalDomain, isNationalDomain } from "../lib/nationalDomain.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as stateDomainRepository from "../repositories/stateDomain.repository.js";
import * as userRepository from "../repositories/user.repository.js";
import {
  stateDomainPatchBodySchema,
  stateDomainPathSchema,
  stateDomainPublicQuerySchema,
} from "../validators/stateDomain.validators.js";

function toStateApiRow(row: {
  stateId: string;
  domainName: string;
  state: { id: string; name: string; code: string };
}) {
  return {
    scope: "STATE" as const,
    stateId: row.stateId,
    stateName: row.state.name,
    domainName: row.domainName,
    nationalAdminId: null,
  };
}

function toNationalApiRow(domainName: string, nationalAdminId: string) {
  return {
    scope: "NATIONAL" as const,
    stateId: null,
    stateName: null,
    domainName,
    nationalAdminId,
  };
}

/** `GET /domains/public/by-domain-name?domainName=` — resolve state or national admin from hostname (no auth). */
export async function getPublicByDomainName(req: Request, res: Response, next: NextFunction) {
  try {
    const q = stateDomainPublicQuerySchema.parse(req.query);

    if (isNationalDomain(q.domainName)) {
      const admin = await userRepository.findPrimaryNationalAdmin();
      if (!admin) {
        throw new AppError(404, "No national admin configured", "NATIONAL_ADMIN_NOT_FOUND");
      }
      return res.json(toNationalApiRow(getNationalDomain(), admin.id));
    }

    const row = await stateDomainRepository.findByDomainName(q.domainName);
    if (!row) {
      throw new AppError(404, "No state configured for this domain", "STATE_DOMAIN_NOT_FOUND");
    }
    res.json(toStateApiRow(row));
  } catch (e) {
    next(e);
  }
}

/** `GET /domains` — national admin list of configured state domains. */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await stateDomainRepository.findMany();
    res.json(rows.map(toStateApiRow));
  } catch (e) {
    next(e);
  }
}

/** `PATCH /domains/:stateId` — national admin update domain for a state. */
export async function patchByStateId(req: Request, res: Response, next: NextFunction) {
  try {
    const params = stateDomainPathSchema.parse(req.params);
    const body = stateDomainPatchBodySchema.parse(req.body);

    const state = await stateRepository.findById(params.stateId);
    if (!state) throw new AppError(404, "State not found", "STATE_NOT_FOUND");

    try {
      const row = await stateDomainRepository.upsertForState(params.stateId, body.domainName);
      res.json(toStateApiRow(row));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        throw new AppError(409, "Domain already assigned to another state", "CONFLICT");
      }
      throw err;
    }
  } catch (e) {
    next(e);
  }
}
