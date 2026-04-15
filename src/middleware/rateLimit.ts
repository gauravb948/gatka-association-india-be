import rateLimit from "express-rate-limit";

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function msEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function rateLimitJson(
  windowMs: number,
  max: number,
  kind: string
): ReturnType<typeof rateLimit> {
  const retryAfterSec = Math.ceil(windowMs / 1000);
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: "Too many requests",
        code: "RATE_LIMITED",
        kind,
        retryAfterSec,
      });
    },
  });
}

/** Default: all `/api/*` traffic (per IP). */
export const apiLimiter = rateLimitJson(
  msEnv("RATE_LIMIT_API_WINDOW_MS", 15 * 60 * 1000),
  intEnv("RATE_LIMIT_API_MAX", 300),
  "api"
);

/** Stricter: auth endpoints (login, register, OTP). */
export const authLimiter = rateLimitJson(
  msEnv("RATE_LIMIT_AUTH_WINDOW_MS", 15 * 60 * 1000),
  intEnv("RATE_LIMIT_AUTH_MAX", 30),
  "auth"
);

/** Stricter: presigned upload URLs. */
export const uploadLimiter = rateLimitJson(
  msEnv("RATE_LIMIT_UPLOAD_WINDOW_MS", 60 * 60 * 1000),
  intEnv("RATE_LIMIT_UPLOAD_MAX", 60),
  "upload"
);
