import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/volunteerRegistrations.controller.js";

export const volunteerRegistrationsRouter = Router();

const adminOnly = requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN");

volunteerRegistrationsRouter.get("/", requireAuth, adminOnly, ctrl.list);
volunteerRegistrationsRouter.get("/:id", requireAuth, adminOnly, ctrl.getById);
