import type { NextFunction, Request, Response } from "express";
import * as refereeRepository from "../repositories/referee.repository.js";
import { publicRefereesListQuerySchema } from "../validators/publicReferees.validators.js";

/** `GET /users/referees/public` — no auth; only accepted, active, non-blacklisted referees. */
export async function listAcceptedPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const q = publicRefereesListQuerySchema.parse(req.query);
    const skip = (q.page - 1) * q.pageSize;
    const [rows, total] = await refereeRepository.findManyAcceptedPublicDirectory(skip, q.pageSize);
    const items = rows.map((r) => ({
      name: r.fullName,
      state: r.state,
      district: r.district,
    }));
    const totalPages = total === 0 ? 0 : Math.ceil(total / q.pageSize);
    res.json({
      items,
      page: q.page,
      pageSize: q.pageSize,
      total,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
}
