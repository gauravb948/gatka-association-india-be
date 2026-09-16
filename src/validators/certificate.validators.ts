import { z } from "zod";

export const certificateKindQuerySchema = z.enum(["winners", "participants"]);

const hexColor = z
  .string()
  .trim()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/, "Color must be a hex value");

const textBlockSchema = z.object({
  id: z.string().trim().min(1).max(80),
  text: z.string().max(2000),
  xMm: z.number().min(-40).max(340),
  yMm: z.number().min(-40).max(250),
  widthMm: z.number().min(10).max(297),
  fontSizePt: z.number().min(6).max(96),
  fontWeight: z.enum(["normal", "bold"]).default("normal"),
  align: z.enum(["left", "center", "right"]).default("center"),
  color: hexColor.default("#1e293b"),
});

const logoBlockSchema = z.object({
  id: z.string().trim().min(1).max(80),
  aboutUsId: z.string().trim().min(1).max(80),
  xMm: z.number().min(-40).max(340),
  yMm: z.number().min(-40).max(250),
  widthMm: z.number().min(8).max(120),
  heightMm: z.number().min(8).max(120),
});

export const certificateLayoutSchema = z.object({
  widthMm: z.number().min(100).max(400).default(297),
  heightMm: z.number().min(80).max(400).default(210),
  backgroundUrl: z
    .union([z.string().max(2000), z.literal(""), z.null()])
    .optional()
    .transform((v) => {
      const trimmed = typeof v === "string" ? v.trim() : "";
      return trimmed || null;
    }),
  blocks: z.array(textBlockSchema).max(40),
  logos: z.array(logoBlockSchema).max(8).optional().default([]),
});

export const certificateRecipientsQuerySchema = z.object({
  kind: certificateKindQuerySchema,
});

export const certificateGenerateBodySchema = z.object({
  kind: certificateKindQuerySchema,
  layout: certificateLayoutSchema,
  playerUserId: z.string().min(1).optional(),
  persistOnly: z.boolean().optional().default(false),
});

export const certificateTemplateBodySchema = z.object({
  kind: certificateKindQuerySchema,
  layout: certificateLayoutSchema,
});

export const certificateTemplateQuerySchema = z.object({
  kind: certificateKindQuerySchema,
});
