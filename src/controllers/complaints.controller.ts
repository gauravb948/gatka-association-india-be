import type { NextFunction, Request, Response } from "express";
import * as complaintRepository from "../repositories/complaint.repository.js";
import {
  complaintCreateSchema,
  complaintRespondSchema,
} from "../validators/complaint.validators.js";

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = complaintCreateSchema.parse(req.body);
    const row = await complaintRepository.createComplaint({
      user: { connect: { id: req.dbUser!.id } },
      subject: body.subject,
      body: body.body,
    });
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await complaintRepository.findManyByUser(req.dbUser!.id);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const body = complaintRespondSchema.parse(req.body);
    const data: { status?: typeof body.status; response?: string } = {};
    if (body.status) data.status = body.status;
    if (body.response !== undefined) data.response = body.response;
    const row = await complaintRepository.updateComplaint(req.params.id, data);
    res.json(row);
  } catch (e) {
    next(e);
  }
}
