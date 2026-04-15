import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as noticesController from "../controllers/notices.controller.js";

export const noticesRouter = Router();

noticesRouter.get("/inbox", requireAuth, noticesController.inbox);
noticesRouter.post("/", requireAuth, noticesController.create);
