import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export function getR2Client() {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");

  return new S3Client({
    region: process.env.R2_REGION || "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function getR2Bucket() {
  return requiredEnv("R2_BUCKET");
}

export function getR2PublicBaseUrl() {
  return requiredEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extFromContentType(contentType: string): string | undefined {
  const base = contentType.split(";")[0]?.trim().toLowerCase();
  return base ? CONTENT_TYPE_EXT[base] : undefined;
}

export async function uploadBufferToR2(params: {
  key: string;
  body: Buffer;
  contentType: string;
}): Promise<{ key: string; publicUrl: string }> {
  const contentType = params.contentType.split(";")[0]?.trim() || "application/octet-stream";
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: params.key,
      Body: params.body,
      ContentType: contentType,
    })
  );
  return {
    key: params.key,
    publicUrl: `${getR2PublicBaseUrl()}/${params.key}`,
  };
}

