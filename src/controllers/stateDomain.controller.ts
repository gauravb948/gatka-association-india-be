import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import * as stateRepository from "../repositories/state.repository.js";
import * as stateDomainRepository from "../repositories/stateDomain.repository.js";
import {
  stateDomainPatchBodySchema,
  stateDomainPathSchema,
} from "../validators/stateDomain.validators.js";

function toApiRow(row: {
  stateId: string;
  domainName: string;
  state: { id: string; name: string; code: string };
}) {
  return {
    stateId: row.stateId,
    stateName: row.state.name,
    domainName: row.domainName,
  };
}

/** `GET /domains` — national admin list of configured state domains. */
export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await stateDomainRepository.findMany();
    res.json(rows.map(toApiRow));
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
      res.json(toApiRow(row));
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
