import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as campsController from "../controllers/camps.controller.js";

export const campsRouter = Router();

campsRouter.get("/", campsController.list);
campsRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  campsController.create
);
campsRouter.post("/:id/register", requireAuth, campsController.register);
campsRouter.get("/:id/registrations", requireAuth, campsController.listRegistrations);
