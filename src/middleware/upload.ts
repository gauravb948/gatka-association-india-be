import multer from "multer";

// Memory storage: file bytes are held in RAM.
// Keep limits conservative; R2 upload happens immediately after.
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
});

