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
  return res.status(500).json({ status: false, data: null, message: "Internal server error" });
}
