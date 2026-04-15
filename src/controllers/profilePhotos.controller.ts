import type { NextFunction, Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import { AppError } from "../lib/errors.js";
import { getR2Bucket, getR2Client, getR2PublicBaseUrl } from "../lib/r2.js";
import { setPhotoUrlForUserRole } from "../repositories/profilePhoto.repository.js";

function safeExtFromContentType(contentType: string): string | undefined {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[contentType];
}

function prefixForRole(role: string) {
  switch (role) {
    case "PLAYER":
      return "profiles/players";
    case "COACH":
      return "profiles/coaches";
    case "REFEREE":
      return "profiles/referees";
    case "VOLUNTEER":
      return "profiles/volunteers";
    default:
      return "profiles/other";
  }
}

export async function uploadMyProfilePhoto(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const u = req.dbUser!;
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw new AppError(400, "file is required");

    const ext = safeExtFromContentType(file.mimetype);
    if (!ext) throw new AppError(400, "Unsupported file type");

    const key = `${prefixForRole(u.role)}/${u.id}/${crypto.randomUUID()}.${ext}`;

    const bucket = getR2Bucket();
    const client = getR2Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const publicUrl = `${getR2PublicBaseUrl()}/${key}`;
    const updated = await setPhotoUrlForUserRole(u.id, u.role, publicUrl);
    if (!updated) {
      throw new AppError(400, "This role does not have a profile photo");
    }
    res.status(201).json({ ok: true, photoUrl: publicUrl });
  } catch (e) {
    next(e);
  }
}

