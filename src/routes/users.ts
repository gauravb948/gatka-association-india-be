import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as userIdCardController from "../controllers/userIdCard.controller.js";
import * as usersPasswordController from "../controllers/usersPassword.controller.js";
import * as usersListController from "../controllers/usersList.controller.js";
import * as publicRefereesController from "../controllers/publicReferees.controller.js";

export const usersRouter = Router();

const list = usersListController.listUsersByRole;

usersRouter.get("/referees/public", publicRefereesController.listAcceptedPublic);

usersRouter.get(
  "/players/by-state/:stateId",
  requireAuth,
  usersListController.listPlayersByState
);
usersRouter.get("/players", requireAuth, list("PLAYER"));
usersRouter.get("/coaches", requireAuth, list("COACH"));
usersRouter.get("/officials", requireAuth, usersListController.listOfficials);
usersRouter.get("/referees", requireAuth, list("REFEREE"));
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
