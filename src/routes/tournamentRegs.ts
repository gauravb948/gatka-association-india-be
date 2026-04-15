import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as tournamentRegsController from "../controllers/tournamentRegs.controller.js";

export const tournamentRegsRouter = Router();

tournamentRegsRouter.post("/", requireAuth, tournamentRegsController.create);
tournamentRegsRouter.post(
  "/:id/finalize-payment",
  requireAuth,
  tournamentRegsController.finalizePayment
);
tournamentRegsRouter.get(
  "/competition/:competitionId",
  requireAuth,
  tournamentRegsController.listByCompetition
);
