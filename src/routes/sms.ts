import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as smsController from "../controllers/sms.controller.js";

export const smsRouter = Router();

smsRouter.get(
  "/templates",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  smsController.listTemplates
);
smsRouter.put(
  "/templates/:key",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  smsController.putTemplate
);
smsRouter.get(
  "/outbox",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  smsController.listOutbox
);
