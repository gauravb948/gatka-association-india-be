import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as certificatesController from "../controllers/certificates.controller.js";

export const certificateTemplatesRouter = Router();

certificateTemplatesRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  certificatesController.getTemplate
);
certificateTemplatesRouter.put(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  certificatesController.putTemplate
);
