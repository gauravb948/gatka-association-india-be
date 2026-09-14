import type { NextFunction, Request, Response } from "express";
import { softDeletePersonByNationalAdmin } from "../lib/adminSoftDelete.js";

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    await softDeletePersonByNationalAdmin(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}
