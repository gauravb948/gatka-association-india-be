import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { buildZodValidationResponseBody } from "../lib/zodValidationResponse.js";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: false,
      data: null,
      message: err.message,
      code: err.code,
    });
  }
  if (err instanceof ZodError) {
    return res.status(400).json(buildZodValidationResponseBody(err));
  }
  console.error(err);
  const code =
    err && typeof err === "object" && "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  if (code.startsWith("ERR_ERL_")) {
    return res.status(400).json({
      status: false,
      data: null,
      message: "Rate limiter proxy configuration error",
      code,
    });
  }
  return res.status(500).json({ status: false, data: null, message: "Internal server error" });
}
