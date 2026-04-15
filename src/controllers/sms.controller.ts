import type { NextFunction, Request, Response } from "express";
import type { SmsTemplateKey } from "@prisma/client";
import * as smsRepository from "../repositories/sms.repository.js";
import { smsTemplatePutBodySchema } from "../validators/sms.validators.js";

export async function listTemplates(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await smsRepository.findAllTemplates();
    res.json(rows);
  } catch (e) {
    next(e);
  }
}

export async function putTemplate(req: Request, res: Response, next: NextFunction) {
  try {
    const key = req.params.key as SmsTemplateKey;
    const body = smsTemplatePutBodySchema.parse(req.body);
    const row = await smsRepository.upsertTemplate(key, body.template);
    res.json(row);
  } catch (e) {
    next(e);
  }
}

export async function listOutbox(_req: Request, res: Response, next: NextFunction) {
  try {
    const rows = await smsRepository.findOutboxRecent(100);
    res.json(rows);
  } catch (e) {
    next(e);
  }
}
