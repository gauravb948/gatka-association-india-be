import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as trainingCentersController from "../controllers/trainingCenters.controller.js";

export const trainingCentersRouter = Router();

trainingCentersRouter.get(
  "/public/by-district/:districtId",
  trainingCentersController.listPublicByDistrict
);
trainingCentersRouter.get(
  "/by-district/:districtId",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.listByDistrict
);
trainingCentersRouter.post(
  "/district/:districtId",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.createForDistrict
);
trainingCentersRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  trainingCentersController.patch
);
