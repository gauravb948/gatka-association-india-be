import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/stateRegistrations.controller.js";

export const stateRegistrationsRouter = Router();

stateRegistrationsRouter.post("/", ctrl.create);
stateRegistrationsRouter.get("/", requireAuth, ctrl.list);
stateRegistrationsRouter.get("/state/:stateId", requireAuth, ctrl.getByStateId);
stateRegistrationsRouter.patch("/:id/status", requireAuth, ctrl.setStatus);
stateRegistrationsRouter.patch("/:id/decision", requireAuth, ctrl.decide);
