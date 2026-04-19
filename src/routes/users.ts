import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as usersListController from "../controllers/usersList.controller.js";

export const usersRouter = Router();

const list = usersListController.listUsersByRole;

usersRouter.get("/players", requireAuth, list("PLAYER"));
usersRouter.get("/coaches", requireAuth, list("COACH"));
usersRouter.get("/referees", requireAuth, list("REFEREE"));
usersRouter.get("/volunteers", requireAuth, list("VOLUNTEER"));
usersRouter.get("/training-centers", requireAuth, list("TRAINING_CENTER"));
usersRouter.get("/district-admins", requireAuth, list("DISTRICT_ADMIN"));
usersRouter.get("/state-admins", requireAuth, list("STATE_ADMIN"));
usersRouter.get("/national-admins", requireAuth, list("NATIONAL_ADMIN"));
usersRouter.get("/:id", requireAuth, usersListController.getUserById);
