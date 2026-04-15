import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as complaintsController from "../controllers/complaints.controller.js";

export const complaintsRouter = Router();

complaintsRouter.post("/", requireAuth, complaintsController.create);
complaintsRouter.get("/me", requireAuth, complaintsController.listMine);
complaintsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  complaintsController.patch
);
