import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadLimiter } from "../middleware/rateLimit.js";
import { uploadSingleImage } from "../middleware/upload.js";
import * as profilePhotosController from "../controllers/profilePhotos.controller.js";

export const profilePhotosRouter = Router();

profilePhotosRouter.post(
  "/me",
  uploadLimiter,
  requireAuth,
  uploadSingleImage.single("file"),
  profilePhotosController.uploadMyProfilePhoto
);

