import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as ctrl from "../controllers/weapons.controller.js";

export const weaponsRouter = Router();

weaponsRouter.get("/public", ctrl.listPublic);
weaponsRouter.get("/", requireAuth, requireRoles("NATIONAL_ADMIN"), ctrl.listAdmin);
weaponsRouter.post("/", requireAuth, requireRoles("NATIONAL_ADMIN"), ctrl.create);
weaponsRouter.patch("/:id", requireAuth, requireRoles("NATIONAL_ADMIN"), ctrl.patch);
weaponsRouter.delete("/:id", requireAuth, requireRoles("NATIONAL_ADMIN"), ctrl.remove);
