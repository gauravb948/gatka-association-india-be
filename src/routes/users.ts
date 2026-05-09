import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as userIdCardController from "../controllers/userIdCard.controller.js";
import * as usersPasswordController from "../controllers/usersPassword.controller.js";
import * as usersListController from "../controllers/usersList.controller.js";

export const usersRouter = Router();

const list = usersListController.listUsersByRole;

usersRouter.get(
  "/players/by-state/:stateId",
  requireAuth,
  usersListController.listPlayersByState
);
usersRouter.get("/players", requireAuth, list("PLAYER"));
usersRouter.get("/coaches", requireAuth, list("COACH"));
usersRouter.get("/referees", requireAuth, list("REFEREE"));
usersRouter.get("/volunteers", requireAuth, list("VOLUNTEER"));
usersRouter.get("/training-centers", requireAuth, list("TRAINING_CENTER"));
usersRouter.get("/district-admins", requireAuth, list("DISTRICT_ADMIN"));
usersRouter.get("/state-admins", requireAuth, list("STATE_ADMIN"));
usersRouter.get("/national-admins", requireAuth, list("NATIONAL_ADMIN"));
usersRouter.get("/id-card/public", userIdCardController.getPublicUserIdCard);
usersRouter.patch(
  "/:userId/password",
  requireAuth,
  requireRoles("NATIONAL_ADMIN", "STATE_ADMIN", "DISTRICT_ADMIN", "TRAINING_CENTER"),
  usersPasswordController.hierarchyResetPassword
);
usersRouter.get("/:id", requireAuth, usersListController.getUserById);
