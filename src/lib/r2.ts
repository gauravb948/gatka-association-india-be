import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export function r2KeyFromPublicUrl(url: string): string | null {
  try {
    const base = getR2PublicBaseUrl();
    const normalized = url.trim();
    if (!normalized || !normalized.toLowerCase().startsWith(base.toLowerCase() + "/")) return null;
    return decodeURIComponent(normalized.slice(base.length + 1));
  } catch {
    return null;
  }
}

/** Best-effort delete; missing objects and non-R2 URLs are ignored. */
export async function deleteR2PublicUrl(url: string): Promise<void> {
  const key = r2KeyFromPublicUrl(url);
  if (!key) return;
  try {
    await getR2Client().send(
      new DeleteObjectCommand({
        Bucket: getR2Bucket(),
        Key: key,
      })
    );
  } catch {
    // Leave the DB delete as the source of truth if R2 is already gone.
  }
}

