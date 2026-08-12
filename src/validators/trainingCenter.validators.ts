import { z } from "zod";
import { capsString, optionalCapsString } from "../lib/storedCaps.js";

export const createTrainingCenterSchema = z.object({
  name: capsString(160),
  isEnabled: z.boolean().optional(),
});

export const patchTrainingCenterSchema = z.object({
  name: optionalCapsString(160),
  isEnabled: z.boolean().optional(),
});
