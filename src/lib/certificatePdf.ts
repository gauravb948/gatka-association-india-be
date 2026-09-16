import { GetObjectCommand } from "@aws-sdk/client-s3";
import { ZipArchive } from "archiver";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import {
  applyCertificateMerge,
  mmToPt,
  type CertificateLayout,
  type CertificateMergeFields,
} from "./certificateLayout.js";
import { mergeFieldsForRecipient, type CertificateRecipient } from "./certificateRecipients.js";
import { prisma } from "./prisma.js";
import { getR2Bucket, getR2Client, r2KeyFromPublicUrl, uploadBufferToR2 } from "./r2.js";
import type { CertificateKind } from "@prisma/client";
import * as generatedCertificateRepository from "../repositories/generatedCertificate.repository.js";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function loadImageBuffer(url: string): Promise<Buffer | null> {
  const key = r2KeyFromPublicUrl(url);
  if (key) {
    try {
      const out = await getR2Client().send(
        new GetObjectCommand({
          Bucket: getR2Bucket(),
          Key: key,
        })
      );
      const bytes = await out.Body?.transformToByteArray();
      if (bytes?.length && bytes.length <= MAX_IMAGE_BYTES) return Buffer.from(bytes);
    } catch {
      // Fall through to HTTP fetch for non-R2 CMS logos.
    }
  }
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (!buf.length || buf.length > MAX_IMAGE_BYTES) return null;
    return buf;
  } catch {
    return null;
  }
}

type PdfDoc = InstanceType<typeof PDFDocument>;

function drawCertificate(
  doc: PdfDoc,
  layout: CertificateLayout,
  fields: CertificateMergeFields,
  background: Buffer | null,
  logoBuffers: Map<string, Buffer>
) {
  const pageW = mmToPt(297);
  const pageH = mmToPt(210);
  if (background) {
    try {
      doc.image(background, 0, 0, { width: pageW, height: pageH });
    } catch {
      // Invalid image — skip background.
    }
  }

  for (const logo of layout.logos ?? []) {
    const buf = logoBuffers.get(logo.aboutUsId);
    if (!buf) continue;
    try {
      doc.image(buf, mmToPt(logo.xMm), mmToPt(logo.yMm), {
        width: mmToPt(logo.widthMm),
        height: mmToPt(logo.heightMm),
      });
    } catch {
      // Skip a bad logo file.
    }
  }

  for (const block of layout.blocks) {
    const text = applyCertificateMerge(block.text, fields);
    if (!text.trim()) continue;
    const x = mmToPt(block.xMm);
    const y = mmToPt(block.yMm);
    const width = mmToPt(block.widthMm);
    doc.font(block.fontWeight === "bold" ? "Times-Bold" : "Times-Roman");
    doc.fontSize(block.fontSizePt);
    doc.fillColor(block.color || "#1e293b");
    doc.text(text, x, y, {
      width,
      align: block.align,
      lineBreak: true,
    });
  }
}

export async function renderCertificatePdfBuffer(
  layout: CertificateLayout,
  fields: CertificateMergeFields,
  background: Buffer | null,
  logoBuffers: Map<string, Buffer>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 0,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    drawCertificate(doc, layout, fields, background, logoBuffers);
    doc.end();
  });
}

export async function loadCertificateBackground(
  layout: CertificateLayout
): Promise<Buffer | null> {
  const url = layout.backgroundUrl?.trim();
  if (!url) return null;
  return loadImageBuffer(url);
}

export async function loadCertificateLogoBuffers(
  layout: CertificateLayout
): Promise<Map<string, Buffer>> {
  const ids = [...new Set((layout.logos ?? []).map((l) => l.aboutUsId))];
  const map = new Map<string, Buffer>();
  if (ids.length === 0) return map;
  const rows = await prisma.aboutUs.findMany({
    where: { id: { in: ids } },
    select: { id: true, logoUrl: true },
  });
  await Promise.all(
    rows.map(async (row) => {
      const url = row.logoUrl.trim();
      if (!url) return;
      const buf = await loadImageBuffer(url);
      if (buf) map.set(row.id, buf);
    })
  );
  return map;
}

function sanitizeFileBase(value: string): string {
  const safe = value.replace(/[<>:"/\\|?*\x00-\x1f"]/g, "_").trim().replace(/\s+/g, "-");
  return (safe || "certificate").slice(0, 80);
}

function uniqueZipName(base: string, used: Set<string>): string {
  let name = `${base}.pdf`;
  let n = 2;
  while (used.has(name.toLowerCase())) {
    name = `${base}-${n}.pdf`;
    n += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

export async function persistGeneratedPdf(params: {
  competitionId: string;
  eventId: string;
  playerUserId: string;
  kind: CertificateKind;
  buf: Buffer;
  generatedById: string | null;
}): Promise<string> {
  const key = `certificates/${params.competitionId}/${params.eventId}/${params.kind}/${params.playerUserId}.pdf`;
  const { publicUrl } = await uploadBufferToR2({
    key,
    body: params.buf,
    contentType: "application/pdf",
  });
  await generatedCertificateRepository.upsertGenerated({
    competitionId: params.competitionId,
    eventId: params.eventId,
    playerUserId: params.playerUserId,
    kind: params.kind,
    fileUrl: publicUrl,
    generatedById: params.generatedById,
  });
  return publicUrl;
}

export async function renderRecipientPdfs(params: {
  layout: CertificateLayout;
  recipients: CertificateRecipient[];
}): Promise<{ recipient: CertificateRecipient; buf: Buffer }[]> {
  const background = await loadCertificateBackground(params.layout);
  const logoBuffers = await loadCertificateLogoBuffers(params.layout);
  const out: { recipient: CertificateRecipient; buf: Buffer }[] = [];
  for (const recipient of params.recipients) {
    const buf = await renderCertificatePdfBuffer(
      params.layout,
      mergeFieldsForRecipient(recipient),
      background,
      logoBuffers
    );
    out.push({ recipient, buf });
  }
  return out;
}

export async function streamCertificatePdf(
  res: Response,
  filename: string,
  buf: Buffer
): Promise<void> {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.end(buf);
}

export async function streamCertificateZip(
  res: Response,
  filename: string,
  files: { recipient: CertificateRecipient; buf: Buffer }[]
): Promise<void> {
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const archive = new ZipArchive({ store: true });
  const archiveError = new Promise<never>((_, reject) => {
    archive.on("error", reject);
  });
  archive.pipe(res);

  const used = new Set<string>();
  const work = (async () => {
    for (const file of files) {
      const base = sanitizeFileBase(file.recipient.fullName || file.recipient.playerUserId);
      archive.append(file.buf, { name: uniqueZipName(base, used) });
    }
    await archive.finalize();
  })();

  await Promise.race([work, archiveError]);
}

export { sanitizeFileBase };
