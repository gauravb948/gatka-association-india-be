import { Router } from "express";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import * as attendanceController from "../controllers/attendance.controller.js";

export const attendanceRouter = Router();

attendanceRouter.post("/", requireAuth, attendanceController.mark);
attendanceRouter.get("/user/:userId", requireAuth, attendanceController.listByUser);
attendanceRouter.get(
  "/competition/:competitionId/summary",
  requireAuth,
  requireRoles("DISTRICT_ADMIN", "STATE_ADMIN", "NATIONAL_ADMIN"),
  attendanceController.competitionSummary
);
