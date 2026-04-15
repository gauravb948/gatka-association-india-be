import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as adminUsersController from "../controllers/adminUsers.controller.js";

export const adminUsersRouter = Router();

adminUsersRouter.get(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  adminUsersController.list
);
adminUsersRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  adminUsersController.create
);
