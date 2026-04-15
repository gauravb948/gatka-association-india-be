import { Router } from "express";
import { requireAuth, requireRoles, requireSuperNational } from "../middleware/auth.js";
import * as settingsController from "../controllers/settings.controller.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/global",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  settingsController.getGlobal
);
settingsRouter.patch(
  "/global/age-calculation-date",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  requireSuperNational,
  settingsController.patchAgeCalculationDate
);
settingsRouter.patch(
  "/global/membership-expiry-date",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  requireSuperNational,
  settingsController.patchMembershipExpiryDate
);

settingsRouter.get("/role-payment-fees", settingsController.getRolePaymentFees);
settingsRouter.patch(
  "/role-payment-fees",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  settingsController.patchRolePaymentFees
);
