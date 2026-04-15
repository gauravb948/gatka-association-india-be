import { Router } from "express";
import { uploadLimiter } from "../middleware/rateLimit.js";
import * as uploadsController from "../controllers/uploads.controller.js";
import { uploadSingleImage } from "../middleware/upload.js";

export const uploadsRouter = Router();

uploadsRouter.post(
  "/r2/upload",
  uploadLimiter,
  uploadSingleImage.single("file"),
  uploadsController.uploadToR2
);

uploadsRouter.post(
  "/r2/presign-put",
  uploadLimiter,
  uploadsController.presignR2Put
);

