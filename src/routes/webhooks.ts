import { Router } from "express";
import * as webhooksController from "../controllers/webhooks.controller.js";

export const webhooksRouter = Router({ mergeParams: true });

webhooksRouter.post("/:stateId", webhooksController.razorpay);
