import type { NextFunction, Request, Response } from "express";
import * as globalSettingsRepository from "../repositories/globalSettings.repository.js";
import * as rolePaymentFeeConfigRepository from "../repositories/rolePaymentFeeConfig.repository.js";
import {
  patchAgeCalculationDateSchema,
  patchMembershipExpiryDateSchema,
} from "../validators/globalSettings.validators.js";
import { rolePaymentFeesPatchSchema } from "../validators/rolePaymentFee.validators.js";

export async function getGlobal(_req: Request, res: Response, next: NextFunction) {
  try {
    const row = await globalSettingsRepository.upsertSingleton(
      { id: "singleton" },
      {}
    );
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function patchAgeCalculationDate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = patchAgeCalculationDateSchema.parse(req.body);
    const row = await globalSettingsRepository.upsertSingleton(
      {
        id: "singleton",
        ageCalculationDate: body.ageCalculationDate
          ? new Date(body.ageCalculationDate)
          : null,
      },
      {
        ageCalculationDate: body.ageCalculationDate
          ? new Date(body.ageCalculationDate)
          : null,
      }
    );
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function patchMembershipExpiryDate(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = patchMembershipExpiryDateSchema.parse(req.body);
    const row = await globalSettingsRepository.upsertSingleton(
      {
        id: "singleton",
        membershipExpiryDate: body.membershipExpiryDate
          ? new Date(body.membershipExpiryDate)
          : null,
      },
      {
        membershipExpiryDate: body.membershipExpiryDate
          ? new Date(body.membershipExpiryDate)
          : null,
      }
    );
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function getRolePaymentFees(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await rolePaymentFeeConfigRepository.findAllOrdered();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function patchRolePaymentFees(req: Request, res: Response, next: NextFunction) {
  try {
    const body = rolePaymentFeesPatchSchema.parse(req.body);
    await rolePaymentFeeConfigRepository.upsertMany(body.fees);
    const rows = await rolePaymentFeeConfigRepository.findAllOrdered();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
