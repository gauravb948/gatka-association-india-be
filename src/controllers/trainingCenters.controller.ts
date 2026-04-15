import type { NextFunction, Request, Response } from "express";
import * as districtRepository from "../repositories/district.repository.js";
import * as trainingCenterRepository from "../repositories/trainingCenter.repository.js";
import { AppError } from "../lib/errors.js";
import {
  createTrainingCenterSchema,
  patchTrainingCenterSchema,
} from "../validators/trainingCenter.validators.js";

export async function listPublicByDistrict(req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await trainingCenterRepository.findManyPublicByDistrict(
      req.params.districtId
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function listByDistrict(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const district = await districtRepository.findById(req.params.districtId);
    if (!district) throw new AppError(404, "District not found");
    if (u.role === "DISTRICT_ADMIN" && u.districtId !== district.id) {
      throw new AppError(403, "Forbidden");
    }
    if (u.role === "STATE_ADMIN" && u.stateId !== district.stateId) {
      throw new AppError(403, "Forbidden");
    }
    const rows = await trainingCenterRepository.findManyByDistrict(req.params.districtId);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function createForDistrict(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const district = await districtRepository.findByIdWithState(req.params.districtId);
    if (!district) throw new AppError(404, "District not found");
    if (u.role === "DISTRICT_ADMIN" && u.districtId !== district.id) {
      throw new AppError(403, "Forbidden");
    }
    if (!district.isEnabled || !district.state.isEnabled) {
      throw new AppError(400, "District or state disabled");
    }
    const body = createTrainingCenterSchema.parse(req.body);
    const tc = await trainingCenterRepository.createTrainingCenter({
      district: { connect: { id: req.params.districtId } },
      name: body.name,
      isEnabled: body.isEnabled ?? true,
    });
    res.status(201).json(tc);
  } catch (e) {
    next(e);
  }
}

export async function patch(req: Request, res: Response, next: NextFunction) {
  try {
    const u = req.dbUser!;
    const existing = await trainingCenterRepository.findByIdWithDistrict(req.params.id);
    if (!existing) throw new AppError(404, "Training center not found");
    if (u.role === "DISTRICT_ADMIN" && u.districtId !== existing.districtId) {
      throw new AppError(403, "Forbidden");
    }
    if (u.role === "STATE_ADMIN" && u.stateId !== existing.district.stateId) {
      throw new AppError(403, "Forbidden");
    }
    const body = patchTrainingCenterSchema.parse(req.body);
    const tc = await trainingCenterRepository.updateTrainingCenter(req.params.id, body);
    res.json(tc);
  } catch (e) {
    next(e);
  }
}
