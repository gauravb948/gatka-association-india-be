import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as noticesController from "../controllers/notices.controller.js";

export const noticesRouter = Router();

// National notices — public list (display=true only) + national-admin CRUD
noticesRouter.get("/national", noticesController.listNationalPublic);
noticesRouter.get(
  "/national/admin",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  noticesController.listNationalAdmin
);
noticesRouter.post(
  "/national",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  noticesController.createNational
);
noticesRouter.patch(
  "/national/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  noticesController.patchNational
);
noticesRouter.delete(
  "/national/:id",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  noticesController.removeNational
);

// Hierarchy notices
noticesRouter.get("/inbox", requireAuth, noticesController.inbox);
noticesRouter.get(
  "/mine",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  noticesController.listMine
);
noticesRouter.post(
  "/",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN"),
  noticesController.create
);
noticesRouter.delete("/:id", requireAuth, noticesController.remove);
