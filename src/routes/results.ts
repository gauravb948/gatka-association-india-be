import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as resultsController from "../controllers/results.controller.js";

export const resultsRouter = Router();

resultsRouter.post(
  "/",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  resultsController.upsert
);
resultsRouter.get(
  "/competition/:competitionId/export.pdf",
  requireAuth,
  resultsController.exportPdf
);
resultsRouter.get(
  "/competition/:competitionId/export.xlsx",
  requireAuth,
  resultsController.exportXlsx
);
