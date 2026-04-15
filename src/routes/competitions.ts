import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as competitionsController from "../controllers/competitions.controller.js";

export const competitionsRouter = Router();

competitionsRouter.get("/", competitionsController.list);
competitionsRouter.post(
  "/",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.create
);
competitionsRouter.get(
  "/:id/eligible-players",
  requireAuth,
  competitionsController.eligiblePlayers
);
