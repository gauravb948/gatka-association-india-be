import { Router } from "express";
import * as verifyController from "../controllers/verify.controller.js";

export const verifyRouter = Router();

verifyRouter.get("/qr", verifyController.verifyQr);
