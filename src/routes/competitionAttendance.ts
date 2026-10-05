import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as competitionAttendanceController from "../controllers/competitionAttendance.controller.js";

export const competitionAttendanceRouter = Router();

competitionAttendanceRouter.post("/bulk", requireAuth, competitionAttendanceController.markBulk);
competitionAttendanceRouter.post("/", requireAuth, competitionAttendanceController.mark);
competitionAttendanceRouter.get("/report", requireAuth, competitionAttendanceController.report);
