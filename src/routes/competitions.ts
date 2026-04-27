import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as competitionAggregateController from "../controllers/competitionAggregate.controller.js";
import * as competitionsController from "../controllers/competitions.controller.js";

export const competitionsRouter = Router();

competitionsRouter.get(
  "/me",
  requireAuth,
  competitionsController.listForCurrentUser
);
competitionsRouter.get("/", competitionsController.list);
competitionsRouter.get(
  "/:id/event-groups",
  competitionsController.getEventGroupsByCompetition
);
competitionsRouter.get(
  "/:id/aggregate-results",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionAggregateController.getAggregateResults
);
competitionsRouter.post(
  "/:id/aggregate-results",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionAggregateController.replaceAggregateResults
);
competitionsRouter.get("/:id", competitionsController.getById);
competitionsRouter.post(
  "/",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.create
);
competitionsRouter.patch(
  "/:id",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.patch
);
competitionsRouter.post(
  "/:id/close",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.close
);
competitionsRouter.get(
  "/:id/eligible-players",
  requireAuth,
  competitionsController.eligiblePlayers
);
competitionsRouter.post(
  "/:id/participations/bulk",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.createParticipationBulk
);
competitionsRouter.post(
  "/:id/participations",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.createParticipation
);
competitionsRouter.get(
  "/:id/players-not-participated",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.listPlayersNotParticipated
);
competitionsRouter.get(
  "/:id/participants",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.listParticipants
);
