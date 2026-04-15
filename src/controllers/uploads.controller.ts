import type { NextFunction, Request, Response } from "express";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { AppError } from "../lib/errors.js";
import { getR2Bucket, getR2Client, getR2PublicBaseUrl } from "../lib/r2.js";
import { r2PresignPutSchema } from "../validators/upload.validators.js";

function safeExtFromContentType(contentType: string): string | undefined {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  return map[contentType];
}

export async function presignR2Put(req: Request, res: Response, next: NextFunction) {
  try {
    const body = r2PresignPutSchema.parse(req.body);
    const ext = safeExtFromContentType(body.contentType);
    if (!ext) {
      throw new AppError(400, "Unsupported contentType");
    }

    const prefix = (body.prefix ?? "banners").replace(/[^a-z0-9/_-]/gi, "");
    const id = crypto.randomUUID();
    const key = `${prefix}/${id}.${ext}`;

    const bucket = getR2Bucket();
    const client = getR2Client();
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: body.contentType,
      }),
      { expiresIn: 60 * 10 }
    );

    const publicUrl = `${getR2PublicBaseUrl()}/${key}`;

    res.json({
      key,
      publicUrl,
      uploadUrl,
      expiresInSeconds: 60 * 10,
    });
  } catch (e) {
    next(e);
  }
}

export async function uploadToR2(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) throw new AppError(400, "file is required");

    const ext = safeExtFromContentType(file.mimetype);
    if (!ext) throw new AppError(400, "Unsupported file type");

    const rawPrefix = String(req.body?.prefix ?? "banners");
    const prefix = rawPrefix.replace(/[^a-z0-9/_-]/gi, "");
    const id = crypto.randomUUID();
    const key = `${prefix}/${id}.${ext}`;

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
    res.status(201).json({ key, publicUrl });
  } catch (e) {
    next(e);
  }
}

