import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as statesController from "../controllers/states.controller.js";

export const statesRouter = Router();

statesRouter.get("/public", statesController.listPublic);
statesRouter.get(
  "/public/registration-accepted",
  statesController.listPublicRegistrationAccepted
);
statesRouter.get("/", requireAuth, requireRoles("NATIONAL_ADMIN"), statesController.listAll);
statesRouter.post("/", requireAuth, requireRoles("NATIONAL_ADMIN"), statesController.create);
statesRouter.get(
  "/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN"),
  statesController.getById
);
statesRouter.patch("/:id", requireAuth, requireRoles("NATIONAL_ADMIN"), statesController.patch);
statesRouter.get(
  "/:id/payment-config",
  requireAuth,
  requireRoles("STATE_ADMIN"),
  statesController.getPaymentConfig
);
statesRouter.put(
  "/:id/payment-config",
  requireAuth,
  requireRoles("STATE_ADMIN"),
  statesController.putPaymentConfig
);
