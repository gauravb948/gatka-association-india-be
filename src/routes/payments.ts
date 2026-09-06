import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as paymentsController from "../controllers/payments.controller.js";
import * as statePaymentConfigController from "../controllers/statePaymentConfig.controller.js";
import * as statePaymentConfigsAdminController from "../controllers/statePaymentConfigsAdmin.controller.js";
import * as nationalPaymentConfigController from "../controllers/nationalPaymentConfig.controller.js";

export const paymentsRouter = Router();

paymentsRouter.post("/razorpay/order", requireAuth, paymentsController.createRazorpayOrder);
paymentsRouter.post("/verify", requireAuth, paymentsController.verify);
paymentsRouter.get("/me", requireAuth, paymentsController.listMine);

paymentsRouter.post("/manual", requireAuth, paymentsController.createManualPayment);
paymentsRouter.get(
  "/manual/pending",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "TRAINING_CENTER"),
  paymentsController.listPendingManualPayments
);
paymentsRouter.post(
  "/manual/:id/approve",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "TRAINING_CENTER"),
  paymentsController.approveManualPayment
);
paymentsRouter.post(
  "/manual/:id/reject",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "TRAINING_CENTER"),
  paymentsController.rejectManualPayment
);

paymentsRouter.post(
  "/reconcile-razorpay",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  paymentsController.reconcileRazorpay
);

paymentsRouter.get(
  "/national-config",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  nationalPaymentConfigController.get
);
paymentsRouter.put(
  "/national-config",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  nationalPaymentConfigController.put
);

// State admin can manage only their own state's payment config.
paymentsRouter.get(
  "/state-config",
  requireAuth,
  requireRoles("STATE_ADMIN"),
  statePaymentConfigController.getMine
);
paymentsRouter.put(
  "/state-config",
  requireAuth,
  requireRoles("STATE_ADMIN"),
  statePaymentConfigController.putMine
);

// By state id: state admin GET/PUT only when param matches assigned state.
paymentsRouter.get(
  "/state-config/:stateId",
  requireAuth,
  requireRoles("STATE_ADMIN"),
  statePaymentConfigController.getByStateId
);
paymentsRouter.put(
  "/state-config/:stateId",
  requireAuth,
  requireRoles("STATE_ADMIN"),
  statePaymentConfigController.putByStateId
);

// National admin management: list/upsert configs by state.
paymentsRouter.get(
  "/state-configs",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  statePaymentConfigsAdminController.list
);
paymentsRouter.put(
  "/state-configs/:stateId",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  statePaymentConfigsAdminController.upsert
);
