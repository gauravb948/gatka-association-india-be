import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ctrl from "../controllers/districtRegistrations.controller.js";

export const districtRegistrationsRouter = Router();

districtRegistrationsRouter.post("/", ctrl.create);
districtRegistrationsRouter.get("/", requireAuth, ctrl.list);
districtRegistrationsRouter.get("/district/:districtId", requireAuth, ctrl.getByDistrictId);
districtRegistrationsRouter.patch("/:id/status", requireAuth, ctrl.setStatus);
