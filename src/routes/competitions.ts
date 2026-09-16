import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as certificatesController from "../controllers/certificates.controller.js";
import * as competitionAggregateController from "../controllers/competitionAggregate.controller.js";
import * as competitionsController from "../controllers/competitions.controller.js";

export const competitionsRouter = Router();

competitionsRouter.get(
  "/me",
  requireAuth,
  competitionsController.listForCurrentUser
);
competitionsRouter.get(
  "/me/sessions",
  requireAuth,
  competitionsController.listCompetitionSessions
);
competitionsRouter.get(
  "/me/for-reports",
  requireAuth,
  competitionsController.listForReports
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
competitionsRouter.get(
  "/:id/fee-submission",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN", "TRAINING_CENTER"),
  competitionsController.getFeeSubmission
);
competitionsRouter.get(
  "/:id/fee-submissions",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN", "TRAINING_CENTER"),
  competitionsController.getFeeSubmissions
);
competitionsRouter.post(
  "/:id/fee-submissions/order",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN"),
  competitionsController.createFeeSubmissionOrder
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
competitionsRouter.delete(
  "/:id",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.remove
);
competitionsRouter.delete(
  "/:id/participants",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.removeAllParticipants
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
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.eligiblePlayers
);
competitionsRouter.post(
  "/:id/participations/bulk",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.createParticipationBulk
);
competitionsRouter.post(
  "/:id/participations/replace",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.replaceParticipation
);
competitionsRouter.post(
  "/:id/participations",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.createParticipation
);
competitionsRouter.delete(
  "/:id/participations",
  requireAuth,
  requireRoles("TRAINING_CENTER", "DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  competitionsController.removeParticipation
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
competitionsRouter.get(
  "/:id/events/:eventId/certificate-recipients",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  certificatesController.listRecipients
);
competitionsRouter.post(
  "/:id/events/:eventId/certificates",
  requireAuth,
  requireRoles("NATIONAL_ADMIN"),
  certificatesController.generateCertificates
);
