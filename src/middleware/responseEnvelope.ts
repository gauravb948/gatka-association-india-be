import type { NextFunction, Request, Response } from "express";

type Envelope = { status: boolean; data: unknown | null; message: string };

function titleCase(s: string) {
  return s
    .replace(/[-_]/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Path as seen on the app (e.g. /api/auth/login). */
function fullPath(req: Request): string {
  const base = req.baseUrl ?? "";
  const p = req.path.startsWith("/") ? req.path : `/${req.path}`;
  const combined = `${base}${p}`.replace(/\/+/g, "/");
  if (combined) return combined;
  return (req.originalUrl ?? "").split("?")[0] ?? "";
}

function messageForKnownRoute(req: Request): string | null {
  const path = fullPath(req).toLowerCase();
  const method = req.method.toUpperCase();

  if (method === "GET" && /\/health\/?$/.test(path)) {
    return "OK";
  }

  if (method === "PATCH" && /\/settings\/role-payment-fees\/?$/.test(path)) {
    return "Role payment fees updated successfully";
  }
  if (method === "PATCH" && /\/auth\/me\/profile\/?$/.test(path)) {
    return "Profile updated successfully";
  }

  if (method !== "POST") return null;

  if (/\/auth\/login\/?$/.test(path)) return "Signed in successfully";
  if (/\/auth\/register\/player\/?$/.test(path)) return "Player registered successfully";
  if (/\/auth\/register\/coach\/?$/.test(path)) return "Coach registration submitted successfully";
  if (/\/auth\/register\/referee\/?$/.test(path)) return "Referee registration submitted successfully";
  if (/\/auth\/register\/volunteer\/?$/.test(path)) return "Volunteer registration submitted successfully";
  if (/\/auth\/register\/training-center\/?$/.test(path)) {
    return "Training center registration submitted successfully";
  }
  if (/\/auth\/otp\/request\/?$/.test(path)) return "OTP sent successfully";
  if (/\/auth\/otp\/confirm\/?$/.test(path)) return "Password updated successfully";
  if (/\/state-registrations\/?$/.test(path)) {
    return "State registration saved; you are signed in";
  }
  if (/\/district-registrations\/?$/.test(path)) {
    return "District registration saved; you are signed in";
  }

  return null;
}

function inferEntity(req: Request) {
  const parts = fullPath(req)
    .split("/")
    .filter(Boolean)
    .map((p) => p.toLowerCase());
  if (parts[0] === "api") parts.shift();
  if (parts.length === 0) return "Resource";
  const resource = parts[0].replace(/-/g, " ");
  return titleCase(resource);
}

function inferAction(req: Request) {
  switch (req.method.toUpperCase()) {
    case "POST":
      return "created";
    case "PATCH":
    case "PUT":
      return "updated";
    case "DELETE":
      return "deleted";
    default:
      return "retrieved";
  }
}

function defaultMessage(req: Request) {
  const known = messageForKnownRoute(req);
  if (known) return known;
  const entity = inferEntity(req);
  const action = inferAction(req);
  return `${entity} ${action} successfully`;
}

export function responseEnvelope(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = ((body: unknown) => {
    // Avoid double-wrapping if controller already returns envelope
    if (
      body &&
      typeof body === "object" &&
      "status" in (body as Record<string, unknown>) &&
      "data" in (body as Record<string, unknown>) &&
      "message" in (body as Record<string, unknown>)
    ) {
      return originalJson(body);
    }

    const env: Envelope = {
      status: true,
      data: body ?? null,
      message: defaultMessage(req),
    };
    return originalJson(env);
  }) as typeof res.json;

  // For res.send() / res.end() (e.g. 204), we leave as-is.
  next();
}
