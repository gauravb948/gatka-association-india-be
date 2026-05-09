import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import * as meProfileController from "../controllers/meProfile.controller.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/login", authLimiter, authController.login);
authRouter.get("/me", requireAuth, authController.me);
authRouter.patch("/me/profile", requireAuth, meProfileController.patchMyProfile);
authRouter.post("/register/player", authLimiter, authController.registerPlayer);
authRouter.post("/register/coach", authLimiter, authController.registerCoach);
authRouter.post("/register/referee", authLimiter, authController.registerReferee);
authRouter.post("/register/volunteer", authLimiter, authController.registerVolunteer);
authRouter.post(
  "/register/training-center",
  authLimiter,
  authController.registerTrainingCenter
);
authRouter.post("/otp/request", authLimiter, authController.otpRequest);
authRouter.post("/otp/confirm", authLimiter, authController.otpConfirm);
