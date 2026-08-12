import { z } from "zod";

/** Trim + uppercase for person/org name-like strings persisted in the DB. */
export function toStoredCaps(value: string): string {
  return value.trim().toUpperCase();
}

/** Required string field stored in caps. */
export function capsString(max: number, min = 1) {
  return z
    .string()
    .min(min)
    .max(max)
    .transform(toStoredCaps);
}

/** Optional string field stored in caps when present. */
export function optionalCapsString(max: number, min = 1) {
  return z
    .string()
    .min(min)
    .max(max)
    .transform(toStoredCaps)
    .optional();
}

/** Optional nullable string field stored in caps when present. */
export function optionalNullableCapsString(max: number, min = 1) {
  return z
    .string()
    .min(min)
    .max(max)
    .transform(toStoredCaps)
    .nullable()
    .optional();
}
