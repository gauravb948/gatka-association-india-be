import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as attendanceController from "../controllers/attendance.controller.js";

export const attendanceRouter = Router();

attendanceRouter.post("/bulk", requireAuth, attendanceController.markBulk);
attendanceRouter.post("/", requireAuth, attendanceController.mark);
attendanceRouter.get("/report", requireAuth, attendanceController.report);
attendanceRouter.get("/user/:userId", requireAuth, attendanceController.listByUser);
